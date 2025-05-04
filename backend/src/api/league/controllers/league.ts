import { factories } from '@strapi/strapi';

type Player = {
  id: string | number;
  name: string;
  email: string;
  faction: string;
  ranking: number;
  leagues?: { id: string | number }[];
};

type League = {
  id: string | number;
  name: string;
  leaguePassword?: string;
  players?: { id: string | number }[];
};

export default factories.createCoreController('api::league.league', ({ strapi }) => ({
  async joinLeague(ctx) {
    const { id: leagueId } = ctx.params;
    const { password } = ctx.request.body;

    const league = (await strapi.entityService.findOne('api::league.league', parseInt(leagueId, 10), {
      fields: ['leaguePassword'],
      populate: ['players'],
    })) as League;

    if (!league) return ctx.badRequest('League not found');
    if (league.leaguePassword && league.leaguePassword !== password) {
      return ctx.unauthorized('Incorrect password');
    }

    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('User not authenticated');

    const playerResults = (await strapi.entityService.findMany('api::player.player', {
      filters: { user: userId },
      populate: ['leagues'],
    })) as Player[];

    let player = playerResults[0];

    if (player) {
      const alreadyJoined = player.leagues?.some((l) => l.id.toString() === leagueId);
      if (alreadyJoined) {
        return ctx.badRequest('User already joined this league');
      }
    }

    if (!player) {
 // Create player
player = await strapi.entityService.create('api::player.player', {
    data: {
      user: userId,
      name: ctx.state.user.username || 'Anonymous',
      faction: 'Unknown',
      ranking: 0,
      leagues: {
        connect: [{ id: parseInt(leagueId, 10) }],
      } as any,
    },
  }) as Player;
  
    } else {
// Update existing player
await strapi.entityService.update('api::player.player', player.id, {
    data: {
      leagues: {
        connect: [{ id: parseInt(leagueId, 10) }],
      } as any,
    },
  });
  
    }

    const leagueHasPlayer = league.players?.some((p) => p.id === player.id);
    if (!leagueHasPlayer) {
  // Update league with new player
await strapi.entityService.update('api::league.league', parseInt(leagueId, 10), {
    data: {
      players: {
        connect: [{ id: player.id }],
      } as any,
    },
  });  
    }

    ctx.send({ message: 'Joined league successfully' });
  },
}));
