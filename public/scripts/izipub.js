#!/usr/bin/env node

import { createLogger } from './lib/logger.js';

const COMMANDS = {
  object: {
    summary: 'Get any object by ID.',
    usage: 'object <OBJECT_ID>',
    needsCount: false,
    requiresId: true,
  },
  container: {
    summary: 'Get a container object by ID.',
    usage: 'container <CONTAINER_ID>',
    needsCount: false,
    requiresId: true,
  },
  'container-links': {
    summary: 'Get container links walking backward from latest or START_ID.',
    usage: 'container-links <CONTAINER_ID> [-n COUNT] [-s START_ID|null]',
    needsCount: true,
    requiresId: true,
  },
  'container-types': {
    summary: 'Get container data types walking backward from latest or START_ID.',
    usage: 'container-types <CONTAINER_ID> [-n COUNT] [-s START_ID|null]',
    needsCount: true,
    requiresId: true,
  },
  'data-type-items': {
    summary: 'Get data items for a data type walking backward from latest or START_ID.',
    usage: 'data-type-items <DATA_TYPE_ID> [-n COUNT] [-s START_ID|null]',
    needsCount: true,
    requiresId: true,
  },
  'data-item-verifications': {
    summary: 'Get verifications for a data item walking backward from latest or START_ID.',
    usage: 'data-item-verifications <DATA_ITEM_ID> [-n COUNT] [-s START_ID|null]',
    needsCount: true,
    requiresId: true,
  },
  'container-data-item-verifications': {
    summary: 'Get verifications for a container, grouped by data_item_id.',
    usage: 'container-data-item-verifications <CONTAINER_ID> [-n COUNT] [-s START_ID|null]',
    needsCount: true,
    requiresId: true,
  },
  'create-container': {
    summary: 'Create a new container on-chain.',
    usage: 'create-container --name <NAME> [--external-id ID] [--description TXT] [--content TXT] [--version TXT] [--schemas TXT] [--apis TXT] [--resources TXT] [--external-index N] [--public-update true|false] [--public-attach true|false] [--public-create-type true|false] [--public-publish true|false] [--event-create true|false] [--event-publish true|false] [--event-attach true|false] [--event-add true|false] [--event-remove true|false] [--event-update true|false] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'update-container': {
    summary: 'Update an existing container on-chain.',
    usage: 'update-container --container-id <CONTAINER_ID> [--external-id ID] [--name TXT] [--description TXT] [--content TXT] [--version TXT] [--schemas TXT] [--apis TXT] [--resources TXT] [--external-index N] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'create-data-type': {
    summary: 'Create a data type under a container.',
    usage: 'create-data-type --container-id <CONTAINER_ID> --name <NAME> [--external-id ID] [--description TXT] [--content TXT] [--version TXT] [--schemas TXT] [--apis TXT] [--resources TXT] [--external-index N] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'update-data-type': {
    summary: 'Update an existing data type.',
    usage: 'update-data-type --container-id <CONTAINER_ID> --data-type-id <DATA_TYPE_ID> [--external-id ID] [--name TXT] [--description TXT] [--content TXT] [--version TXT] [--schemas TXT] [--apis TXT] [--resources TXT] [--external-index N] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'publish-data-item': {
    summary: 'Publish a data item.',
    usage: 'publish-data-item --container-id <CONTAINER_ID> --data-type-id <DATA_TYPE_ID> --name <NAME> --description <TXT> --content <TXT> [--external-id ID] [--external-index N] [--recipients ADDR1,ADDR2] [--references ID1,ID2] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'publish-data-item-verification': {
    summary: 'Publish a data item verification.',
    usage: 'publish-data-item-verification --container-id <CONTAINER_ID> --data-item-id <DATA_ITEM_ID> --name <NAME> --description <TXT> --content <TXT> [--external-id ID] [--external-index N] [--recipients ADDR1,ADDR2] [--references ID1,ID2] [--verified true|false] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'attach-child': {
    summary: 'Attach a child container to a parent container.',
    usage: 'attach-child --parent-id <PARENT_CONTAINER_ID> --child-id <CHILD_CONTAINER_ID> --name <NAME> [--external-id ID] [--description TXT] [--content TXT] [--external-index N] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'update-child-link': {
    summary: 'Update an existing child link between containers.',
    usage: 'update-child-link --link-id <CHILD_LINK_ID> --parent-id <PARENT_CONTAINER_ID> --child-id <CHILD_CONTAINER_ID> [--external-id ID] [--name TXT] [--description TXT] [--content TXT] [--external-index N] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'add-owner': {
    summary: 'Add owner to a container.',
    usage: 'add-owner --container-id <CONTAINER_ID> --owner <ADDRESS> [--role ROLE] [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'remove-owner': {
    summary: 'Remove owner from a container.',
    usage: 'remove-owner --container-id <CONTAINER_ID> --owner <ADDRESS> [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
  'recount-owners-active': {
    summary: 'Recalculate and store active owner count for a container.',
    usage: 'recount-owners-active --container-id <CONTAINER_ID> [--input-file payload.json]',
    write: true,
    requiresId: false,
  },
};

function printHelp(command = null) {
  if (command && COMMANDS[command]) {
    const meta = COMMANDS[command];
    const lines = [
      '',
      command,
      '-'.repeat(command.length),
      meta.summary,
      '',
      'Usage:',
      `  node izipub.js ${meta.usage}`,
      '',
      'Options:',
      '      --network <name>',
      '      IOTA network name',
      '      (default: IOTA_NETWORK / IZIPUB_NETWORK / mainnet)',
      '',
      '      --env-file <PATH>',
      '      Optional env file with network/signer/on-chain IDs',
      '',
      '      Auto-load:',
      '      .env.cli / .env.cli.local / .env / .env.production / .env.local',
      '',
      '  -v, --verbose',
      '      Debug logging to stderr',
      '',
      '  -q, --quiet',
      '      Errors only',
      '',
      '      --compact',
      '      Compact JSON output',
      '',
      '  -h, --help',
      '      Show help',
      '',
    ];

    if (meta.needsCount) {
      lines.splice(
        8,
        0,
        '  -n, --count <N>',
        '      Number of items to return',
        '      (default: 50 for list commands)',
        '',
        '  -s, --start-id <ID>',
        '      Object ID to start from',
        '      or null for latest',
        ''
      );
    }

    if (meta.write) {
      lines.splice(
        8,
        0,
        '      --private-key <IOTAPRIVKEY>',
        '      Signer private key (or set IOTA_PRIVATE_KEY or IZIPUB_PRIVATE_KEY)',
        '',
        '      --mnemonic "<words...>"',
        '      Signer mnemonic (or set IOTA_MNEMONIC)',
        '',
        '      --derivation-path <PATH>',
        '      Optional mnemonic derivation path',
        '',
        '      --input-file <PATH>',
        '      JSON file with write command fields',
        '      (flag names, camelCase, or snake_case)',
        '',
        '      Rule:',
        '      CLI flags override file values',
        '',
        '      Tip:',
        '      Use --no-<flag> for boolean false',
        '',
        '      --gas-budget <MIST>',
        '      Optional gas budget override',
        ''
      );
    }

    console.log(
      lines.join("\n")
    );    
    return;
  }

  console.log(`
iZiPublisher CLI
================

Usage:
  node izipub.js <command> [arguments] [options]

Read commands:
  object                               ${COMMANDS.object.summary}
  container                            ${COMMANDS.container.summary}
  container-links                      ${COMMANDS['container-links'].summary}
  container-types                      ${COMMANDS['container-types'].summary}
  data-type-items                      ${COMMANDS['data-type-items'].summary}
  data-item-verifications              ${COMMANDS['data-item-verifications'].summary}
  container-data-item-verifications    ${COMMANDS['container-data-item-verifications'].summary}

Write commands:
  create-container                     ${COMMANDS['create-container'].summary}
  update-container                     ${COMMANDS['update-container'].summary}
  create-data-type                     ${COMMANDS['create-data-type'].summary}
  update-data-type                     ${COMMANDS['update-data-type'].summary}
  publish-data-item                    ${COMMANDS['publish-data-item'].summary}
  publish-data-item-verification       ${COMMANDS['publish-data-item-verification'].summary}
  attach-child                         ${COMMANDS['attach-child'].summary}
  update-child-link                    ${COMMANDS['update-child-link'].summary}
  add-owner                            ${COMMANDS['add-owner'].summary}
  remove-owner                         ${COMMANDS['remove-owner'].summary}
  recount-owners-active                ${COMMANDS['recount-owners-active'].summary}

Global options:
  -n, --count <N>       Number of items to return for list commands
  -s, --start-id <ID>   Start object ID, or null for latest
      --network <name>  IOTA network name (default: IOTA_NETWORK / IZIPUB_NETWORK / mainnet)
      --private-key     Signer key for write commands (or IOTA_PRIVATE_KEY or IZIPUB_PRIVATE_KEY)
      --mnemonic        Signer mnemonic for write commands (or IOTA_MNEMONIC)
      --env-file        Optional env file path for network/signer/MOVE IDs
      --input-file      Optional JSON payload file for write commands
      Rule:             CLI flags override file values
      --gas-budget      Optional gas budget for write commands
      Auto-load         .env.cli / .env.cli.local / .env / .env.production / .env.local
  -v, --verbose         Debug logging to stderr
  -q, --quiet           Errors only
      --compact         Compact JSON output
  -h, --help            Show help

Examples:
  node izipub.js object 0x...
  node izipub.js container-links 0x... -n 50 -s null
  node izipub.js create-container --name "My Container" --private-key iotaprivkey...
  node izipub.js create-container --name "My Container" --env-file ./.env.cli
  node izipub.js create-data-type --container-id 0x... --name "Invoice" --private-key iotaprivkey...
  node izipub.js publish-data-item --container-id 0x... --data-type-id 0x... --name "Item A" --description "..." --content "..." --private-key iotaprivkey...
  node izipub.js publish-data-item --input-file ./payload.json --private-key iotaprivkey...
  node izipub.js update-child-link --link-id 0x... --parent-id 0x... --child-id 0x... --name "Updated Link" --private-key iotaprivkey...
`);
}

function parseArgs(argv) {
  const args = {
    count: 50,
    startId: null,
    network: '',
    compact: false,
    logLevel: 'info',
    envFile: null,
    gasBudget: null,
    options: {},
  };

  if (argv.length === 0) return { help: true, args };

  const command = argv[0];
  const positional = [];

  for (let i = 1; i < argv.length; i++) {
    const token = argv[i];

    if (token === '-h' || token === '--help') return { help: true, command, args };
    if (token === '-v' || token === '--verbose') {
      args.logLevel = 'debug';
      continue;
    }
    if (token === '-q' || token === '--quiet') {
      args.logLevel = 'error';
      continue;
    }
    if (token === '--compact') {
      args.compact = true;
      continue;
    }
    if (token === '-n' || token === '--count') {
      args.count = Number(argv[++i]);
      continue;
    }
    if (token === '-s' || token === '--start-id') {
      args.startId = argv[++i] ?? null;
      continue;
    }
    if (token === '--network') {
      args.network = argv[++i] ?? '';
      continue;
    }
    if (token === '--env-file') {
      args.envFile = argv[++i] ?? null;
      continue;
    }
    if (token === '--gas-budget') {
      args.gasBudget = argv[++i] ?? null;
      continue;
    }

    if (token.startsWith('--no-')) {
      args.options[token.slice(5)] = false;
      continue;
    }
    if (token.startsWith('--')) {
      const eqIdx = token.indexOf('=');
      if (eqIdx > 2) {
        const key = token.slice(2, eqIdx);
        const value = token.slice(eqIdx + 1);
        args.options[key] = value;
        continue;
      }

      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        args.options[key] = next;
        i++;
      } else {
        args.options[key] = true;
      }
      continue;
    }

    positional.push(token);
  }

  return { command, positional, args };
}

async function main() {
  const { command, positional = [], args, help } = parseArgs(process.argv.slice(2));

  if (help || !command || !COMMANDS[command]) {
    printHelp(command && COMMANDS[command] ? command : null);
    if (!help) process.exitCode = 1;
    return;
  }

  const meta = COMMANDS[command];
  args.id = positional[0] ?? null;

  if (meta.requiresId && !args.id) {
    console.error(`Missing required ID argument.\n`);
    printHelp(command);
    process.exit(1);
  }

  const logger = createLogger(args.logLevel);

  try {
    const { runCommand } = await import('./lib/commands.js');
    const result = await runCommand(command, args, logger);
    process.stdout.write(
      JSON.stringify(
        result,
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
        args.compact ? 0 : 2
      ) + '\n'
    );
  } catch (error) {
    logger.error(error?.message || String(error));
    process.exit(1);
  }
}

main();
