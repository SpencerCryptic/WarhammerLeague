export default {
  routes: [
    {
      method: 'GET',
      path: '/league-players',
      handler: 'league-player.find',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/league-players/:id',
      handler: 'league-player.findOne',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/league-players',
      handler: 'league-player.create',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'PUT',
      path: '/league-players/:id',
      handler: 'league-player.update',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'DELETE',
      path: '/league-players/:id',
      handler: 'league-player.delete',
      config: {
        auth: {
          required: true,
        },
      },
    },
    {
      method: 'GET',
      path: '/league-players/:id/matches',
      handler: 'league-player.matches',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/league-players/:id/faction',
      handler: 'league-player.updateFaction',
      config: {
        auth: {
          required: true,
        },
      },
    },
  ],
};
