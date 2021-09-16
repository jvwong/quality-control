import { Parser } from 'json2csv';
import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';

import docs from './data.json';

const DATA_OUTPUT_PATH = './out.csv';

const json2csv = jsonData =>  {
  try {
    const parser = new Parser();
    const csv = parser.parse( jsonData );
    return csv;
  } catch (err) {
    console.error(err);
  }
};

const writeFile = Promise.promisify( fs.writeFile );
const writeToFile = async data =>  {
  try {
    await writeFile( DATA_OUTPUT_PATH, data );

    return data;
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
            id,
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
                interactionId: null,
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
    });

    const csvData = json2csv( formattedDocs );
    await writeToFile( csvData );

    process.exit( 0 );

  } catch ( err ) {
    console.error( err );
    process.exit( 1 );
  }
}

main();

