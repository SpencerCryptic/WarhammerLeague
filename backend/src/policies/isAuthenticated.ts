export default (policyContext, config, { strapi }) => {
  if (policyContext.state.user) {
    // User is authenticated, allow access
    return true;
  }

  // User is not authenticated, deny access
  return false;
};