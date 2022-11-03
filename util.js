import { Parser } from 'json2csv';
import { writeFile } from 'fs/promises';
import { InvalidArgumentError } from 'commander';

export const writeToFile = async ( data, path ) =>  {
  try {
    await writeFile( path, data );

    return data;
  } catch (err) {
    console.error(err);
  }
};

export const json2csv = jsonData =>  {
  try {
    const parser = new Parser();
    const csv = parser.parse( jsonData );
    return csv;
  } catch (err) {
    console.error(err);
  }
};

export const myParseInt = value => {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
};

export async function sendOutput (res, options) {
  const docsCsv = json2csv(res);
  if ( options.output ) {
    await writeToFile(docsCsv, options.output);
  } else {
    return console.log(docsCsv);
  }
}