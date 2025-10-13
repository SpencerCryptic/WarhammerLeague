
export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }) {
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    if (authenticatedRole) {
      const permissions = await strapi.query('plugin::users-permissions.permission').findMany({
        where: {
          role: authenticatedRole.id,
          action: 'api::match.match.userMatches',
        },
      });

      if (permissions.length === 0) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: {
            action: 'api::match.match.userMatches',
            role: authenticatedRole.id,
            enabled: true,
          },
        });
      } else if (!permissions[0].enabled) {
        await strapi.query('plugin::users-permissions.permission').update({
          where: { id: permissions[0].id },
          data: { enabled: true },
        });
      }
    }

    strapi.db.lifecycles.subscribe({
      models: ['plugin::users-permissions.user'],
      async afterCreate(event) {
        const { result } = event;
        const userId = result.id;

        const existingPlayers = await strapi.entityService.findMany('api::player.player', {
          filters: { user: userId },
        });

        if (!existingPlayers.length) {
          await strapi.entityService.create('api::player.player', {
            data: {
              name: result.username || result.email,
              email: result.email,
              user: userId,
            },
          });
        }
      },
    });

    // Populate firstName and lastName for existing LeaguePlayer records on startup
    console.log('🔍 Checking LeaguePlayer records for missing firstName/lastName...');
    try {
      const leaguePlayers = await strapi.documents('api::league-player.league-player').findMany({
        filters: {
          $or: [
            { firstName: { $null: true } },
            { firstName: '' },
            { lastName: { $null: true } },
            { lastName: '' }
          ]
        },
        populate: {
          player: {
            populate: ['user']
          }
        }
      });

      console.log(`📊 Found ${leaguePlayers.length} league players with missing names`);

      let updatedCount = 0;

      for (const leaguePlayer of leaguePlayers) {
        const user = (leaguePlayer as any).player?.user;

        if (user?.firstName && user?.lastName) {
          await strapi.documents('api::league-player.league-player').update({
            documentId: leaguePlayer.documentId,
            data: {
              firstName: user.firstName,
              lastName: user.lastName
            }
          });
          console.log(`✅ Updated ${leaguePlayer.leagueName} with ${user.firstName} ${user.lastName}`);
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        console.log(`✨ Successfully populated ${updatedCount} LeaguePlayer records`);
      } else {
        console.log('ℹ️  No LeaguePlayer records needed updating');
      }
    } catch (error) {
      console.error('❌ Error populating LeaguePlayer names:', error);
    }
  },
};
