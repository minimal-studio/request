import '@dear-ui/all/style/default.scss';

export default ({ children }) => {
  window.__removeLoading();
  return children;
};
