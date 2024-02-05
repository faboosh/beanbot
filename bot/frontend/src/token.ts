const setToken = (token: string) => {
  localStorage.setItem("jwt", token);
};

const getToken = () => {
  return localStorage.getItem("jwt");
};

export { setToken, getToken };
