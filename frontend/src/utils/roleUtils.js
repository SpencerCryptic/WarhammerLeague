export const hasRole = (user, roleName) => {
  return user?.role?.name === roleName || user?.role?.type === roleName;
};

export const canCreateLeagues = (user) => {
  return hasRole(user, 'Admin') || hasRole(user, 'LeagueCreator') || hasRole(user, 'leaguecreator');
};