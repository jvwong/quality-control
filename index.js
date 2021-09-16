import { Parser } from 'json2csv';
import _ from 'lodash';

import docs from './data.json';

const BASE_URL = 'https://biofactoid.org/';

const json2csv = jsonData =>  {
  try {
    const parser = new Parser();
    const csv = parser.parse( jsonData );
    return csv;
  } catch (err) {
    console.error(err);
  }
};

const main = async () => {

  try {

    const formattedDocs = [];

    const docData = docs.forEach( doc => {
      const { id, interactions } = doc;

      interactions.forEach( interaction => {
        const { id: interactionId, participants, type: interactionType } = interaction;

        participants.forEach( participant => {
          const { id: participantId, type: participantType, group, name, xref, components } = participant;
          const entry = {
            url: `${BASE_URL}document/${id}`,
            interactionId,
            interactionType,
            interactionType_score: null,
            evidence: null,
            participantId,
            name,
            participantType,
            xref,
            xref_score: null,
            complex_evidence: null,
            group,
            group_score: null,
            comments: null
          };

          formattedDocs.push( entry );

          if( components ){
            components.forEach( component => {
              const { id: componentId, type: componentType, name, xref } = component;
              const componentEntry = _.assign( {}, entry, {
                participantId: componentId,
                participantType: componentType,
                interactionType: null,
                group: null,
                name,
                xref
              });
              formattedDocs.push( componentEntry );
            });
          }

        });
      });
    })
    const csvData = json2csv( formattedDocs );
    console.log( csvData );

    process.exit( 0 );

  } catch ( err ) {
    console.error( err );
    process.exit( 1 );
  }
}

main();

