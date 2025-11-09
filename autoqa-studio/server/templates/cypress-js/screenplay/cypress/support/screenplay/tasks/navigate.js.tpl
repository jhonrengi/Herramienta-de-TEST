export const Navigate = {
  to: path => async actor => {
    const page = actor.ability('page');
    page.visit(path);
  }
};
