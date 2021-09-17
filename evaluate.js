r.db('factoid')
  .table('document')
    .getAll(
      '104efd69-c6e5-48e2-95ed-b921af7b3bf3'
    )
    .map( function( document ){
      return document.merge({ entries: document( 'entries' )( 'id' ) });
    })

    .merge( function( document ) {
      return {
        interactions:
          r.db('factoid').table('element')
            .getAll( r.args( document( 'entries' ) ) )
            .coerceTo( 'array' )
            .pluck( 'id', 'association', 'type', 'name', 'entries' )
            .filter(function (element) {
              return  element('type').eq('ggp').not()
                .and( element('type').eq('dna').not() )
                .and( element('type').eq('rna').not() )
                .and( element('type').eq('protein').not() )
                .and( element('type').eq('chemical').not() )
                .and( element('type').eq('complex').not()  )
            })
            .merge( function( interaction ){
              return {
                participants: interaction('entries')
                  .map( function( entry ){
                    return r.db('factoid').table('element')
                      .get( entry('id') )
                      .pluck( 'id', 'type', 'name', 'association', 'parentId' )
                      .merge( { group: entry('group') } )
                      .merge( function( entry ) {
                        return r.branch( entry('type').eq('complex'),
                          {
                            components: r.db('factoid').table('element')
                            	.get( entry('id') )('entries')
                              .map( function( component ){
                                return r.db('factoid').table('element')
                                  .get( component('id') )
                                  .pluck( 'id', 'type', 'name', 'association', 'parentId' )
                              })
                              .merge( function( component ){
                                  return {
                                    xref: component('association')('dbPrefix').add( ':', component('association')('id') )
                                  }
                              })
                              .without( 'association' )
                          },
                          {}
                        )
                      })
                  })
                  .merge( function( entry ){
                    return {
                      xref: r.branch(
                        entry.hasFields('association'), entry('association')('dbPrefix').add( ':', entry('association')('id') ) ,
                        ''
                      )
                    }
                  })
                .map( function( entry ){
                  return entry
                    .pluck( 'id', 'name', 'xref', 'group', 'type', 'parentId', 'components' )
                })
              };
            })
            .filter( function( interaction ) { // intra-components
              return interaction('participants')(0).hasFields('parentId').not()
                .or( interaction('participants')(1).hasFields('parentId').not() )
                .or( interaction('participants')(0)('parentId').eq( interaction('participants')(1)('parentId') ).not() )
            })
            .without('association', 'name', 'entries' )
      };
    })
    .pluck( 'id', 'interactions' )