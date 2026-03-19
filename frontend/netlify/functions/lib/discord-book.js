const EMBED_COLOR = 0xf59e0b;

const TABLES = {
  'wargaming': {
    name: 'Wargaming Table (6x4)',
    description: 'Full-size 6x4 wargaming table for Warhammer 40K, AoS, Horus Heresy, and more.',
    url: 'https://crypticcabin.com/products/table-hire-wargaming-table',
  },
  'board': {
    name: 'Board Gaming Table',
    description: 'Board gaming table for D&D, board games, card games, and smaller wargames.',
    url: 'https://crypticcabin.com/products/table-hire-board-gaming-table',
  },
};

async function handleBook(tableType) {
  // If no specific type or "all", show both options
  if (!tableType || tableType === 'all') {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Table Hire',
          description: 'Book a table at Cryptic Cabin:',
          color: EMBED_COLOR,
          fields: Object.values(TABLES).map(t => ({
            name: t.name,
            value: `${t.description}\n[Book Now](${t.url})`,
            inline: false
          })),
          url: 'https://crypticcabin.com/collections/table-hire',
          footer: { text: 'Cryptic Cabin \u00B7 Table Hire' }
        }]
      }
    };
  }

  const table = TABLES[tableType];
  if (!table) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Table Hire',
          description: `Unknown table type. Choose **wargaming** (6x4) or **board gaming**.\n\n[Browse Table Hire](https://crypticcabin.com/collections/table-hire)`,
          color: EMBED_COLOR
        }]
      }
    };
  }

  return {
    type: 4,
    data: {
      embeds: [{
        title: `Table Hire: ${table.name}`,
        description: `${table.description}\n\n**[Click here to book](${table.url})**`,
        color: EMBED_COLOR,
        url: table.url,
        footer: { text: 'Cryptic Cabin \u00B7 Table Hire' }
      }]
    }
  };
}

module.exports = { handleBook };
