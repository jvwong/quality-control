
import { program } from 'commander';

import { format as doFormat } from './format.js';
import { myParseInt, sendOutput } from './util.js';

async function format (options) {
  const res = await doFormat(options);
  await sendOutput(res, options);
  process.exit(0);
}

async function main () {
  (program
    .name('quality-control')
    .description('A CLI to do quality control')
  );

  (program.command('format')
    .option( '-o, --output <file>', 'CSV output file (standard output by default)' )
    .option( '-s, --status <string>', 'Filter on status (default \'public\')', 'public' )
    .option( '-l, --limit <number>', 'Maximum number of documents to output', myParseInt, 1000 )
    .description( 'Output a CSV file of the interactions and entities for evaluation purposes' )
    .action(format)
  );

  await program.parseAsync();
}

main();
