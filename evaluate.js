// with recursion into complex - need to filter out intra-component interactions
  r.db('factoid')

  .table('document')

    .filter({'id': 'fbd87825-f70a-482f-a9c2-0787be0d412a' })
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
              return element('type').eq('protein').not().and( element('type').eq('chemical').not() ).and( element('type').eq('complex').not() );
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
           .without('association', 'name', 'entries' )
      };
    })
  .pluck( 'id', 'interactions' )

