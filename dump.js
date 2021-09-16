r.db('factoid')

  .table('document')
  .filter( { 'status': 'public' } )

  .map( function( document ){
    return document.merge({
      articleTitle: document( 'article' )( 'MedlineCitation' )( 'Article' )( 'ArticleTitle' ),
      articleYear: document( 'article' )( 'MedlineCitation' )( 'Article' )( 'Journal' )( 'JournalIssue' )( 'PubDate' )( 'Year' ).default( null ),
      journalTitle: document( 'article' )( 'MedlineCitation' )( 'Article' )( 'Journal' )( 'Title' )
    });
  })
  .merge( function( document ) {
    return {
      pubmed: r.expr('https://pubmed.ncbi.nlm.nih.gov/').add( document('article')('PubmedData')('ArticleIdList').filter({ IdType: 'pubmed' })('id')(0).default( null ) ),
      link: r.expr('https://doi.org/').add( document('article')('PubmedData')('ArticleIdList').filter({ IdType: 'doi' })('id')(0).default( null ) )
    };
  })
  .merge( function( document ) {
    return {
      publicUrl: r.expr('https://biofactoid.org/document/').add(document('id'))
    };
  })
  .merge( function( document ) {

    return {
      createdDate: r.branch(
        ( document( 'createdDate' ).typeOf() ).eq( 'PTYPE<TIME>' ), document( 'createdDate' ).toISO8601(),
        ( document( 'createdDate' ).typeOf() ).eq( 'NUMBER' ), r.epochTime( document( 'createdDate' ) ).toISO8601(),
         r.error( 'Cannot recognize createdDate' ),

      )
    };
  })
  .pluck( 'id', 'secret', 'createdDate', 'articleTitle', 'articleYear', 'journalTitle', 'pubmed', 'link', 'publicUrl' )
  // .pluck( 'elements', 'pmid' )

