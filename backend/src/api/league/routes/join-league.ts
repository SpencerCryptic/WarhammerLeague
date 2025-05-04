export default {
    routes: [
      {
        method: "POST",
        path: "/leagues/:id/join",
        handler: "league.joinLeague",
        config: {
          auth: {
            scope: ["plugin::users-permissions.authenticated"],
          },
        },
      },
    ],
  };
  