import _ from 'lodash';
import r from 'rethinkdb';

import db from './db.js';

// *********************************
// *********  RethinkDB ************
// *********************************
let loadTable = name => db.accessTable( name );

const getDocuments = async ({ status = 'public', limit = 10 }) => {
  const byStatus = r.row( 'status' ).eq( status )
  const mergeEntryIds = d => d.merge({ entries: d( 'entries' )( 'id' ) });
  const getPmid = d => ({ pmid: d('article')('PubmedData')('ArticleIdList').filter(function(o){ return o('IdType').eq('pubmed') }).nth(0)('id') });
  const getComplexComponents = e => {
    return r.branch( e('type').eq('complex'),
      {
        components: element
          .get( e('id') )('entries')
          .map( function( component ){
            return element
              .get( component('id') )
              .pluck( 'id', 'type', 'name', 'association', 'parentId' )
          })
          .merge( function( component ){
              return {
                xref: component('association')('dbPrefix').add( ':', component('association')('id') ),
                organismName: r.branch( component('association').hasFields('organismName'), component('association')('organismName'), '' )
              }
          })
          .without( 'association' )
      },
      {}
    )
  };
  const getInteractions = element => {
    const excludeEntities = e => {
      return  e('type').eq('ggp').not()
        .and( e('type').eq('dna').not() )
        .and( e('type').eq('rna').not() )
        .and( e('type').eq('protein').not() )
        .and( e('type').eq('chemical').not() )
        .and( e('type').eq('complex').not()  )
    };
    return d => {
      return {
        interactions: element
          .getAll( r.args( d( 'entries' ) ) )
          .coerceTo( 'array' )
          .pluck( 'id', 'association', 'type', 'name', 'entries' )
          .filter( excludeEntities )
          .merge( function( i ){
            return {
              participants: i('entries')
                .map( function( e ){
                  return element
                    .get( e('id') )
                    .pluck( 'id', 'type', 'name', 'association', 'parentId' )
                    .merge( { group: e('group') } )
                    .merge( getComplexComponents )
                })
                .merge( function( e ){
                  return {
                    xref: r.branch(
                      e.hasFields('association'), e('association')('dbPrefix').add( ':', e('association')('id') ) ,
                      ''
                    ),
                    organismName: r.branch( e.hasFields({'association': {'organismName': true}}), e('association')('organismName'), '' )
                  }
                })
              .map( function( e ){
                return e.pluck( 'id', 'name', 'xref', 'organismName', 'group', 'type', 'parentId', 'components' )
              })
            };
          })
          .filter( function( i ) { // intra-components
            return i('participants')(0).hasFields('parentId').not()
              .or( i('participants')(1).hasFields('parentId').not() )
              .or( i('participants')(0)('parentId').eq( i('participants')(1)('parentId') ).not() )
          })
          .without('association', 'name', 'entries' )
      };
    };
  };

  const { conn, table: document } = await loadTable( 'document' );
  const { table: element } = await loadTable( 'element' );
  const q = document
    .filter( byStatus )
    .map( mergeEntryIds )
    .merge( getPmid )
    .merge( getInteractions( element ) )
    .pluck( 'id', 'interactions', 'pmid', 'createdDate' );

  const cursor = await q.limit(limit).run( conn );
  return cursor.toArray();
};

const formatDocs = docs => {
  const formattedDocs = [];
  docs.forEach( doc => {
    const { id, interactions, pmid, createdDate } = doc;

    interactions.forEach( interaction => {
      const { id: interactionId, participants, type: interactionType } = interaction;

      participants.forEach( participant => {
        const { id: participantId, type: participantType, group, name, xref, components, organismName } = participant;
        const entry = {
          id,
          createdDate: new Date(createdDate * 1000),
          pmid,
          interactionId,
          interactionType,
          interactionType_score: null,
          evidence: null,
          participantId,
          name,
          participantType,
          xref,
          organismName,
          xref_score: null,
          complex_evidence: null,
          group,
          group_score: null,
          comments: null
        };

        formattedDocs.push( entry );

        if( components ){
          components.forEach( component => {
            const { id: componentId, type: componentType, name, organismName, xref } = component;
            const componentEntry = _.assign( {}, entry, {
              interactionId: null,
              participantId: componentId,
              participantType: componentType,
              interactionType: null,
              group: null,
              name,
              xref,
              organismName
            });
            formattedDocs.push( componentEntry );
          });
        }
      });
    });
  });

  return formattedDocs;
};

export const format = async options => {
  const { status, limit, output } = options;

  try {
    const docs = await getDocuments( { status, limit } );
    const formattedDocs = formatDocs( docs );
    return formattedDocs;
  } catch ( err ) {
    console.error( err );
  }
}