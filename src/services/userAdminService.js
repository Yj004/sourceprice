import api from './apiClient.js';

export const fetchUsers = () => api.getUsers();

export const addUser = (email, password) =>
  api.createUser(email, password);

export const removeUser = (email) => api.deleteUser(email);
