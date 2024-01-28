import { getToken } from "../token";
const API_URL = `${import.meta.env.VITE_API_URL}/api/v1`;

console.log(import.meta.env);
class API {
  static getHeaders() {
    return {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    };
  }

  static post(url: string, body?: any) {
    return fetch(`${API_URL}/${url}`, {
      headers: API.getHeaders(),
      method: "POST",
      body: JSON.stringify(body),
    }).then((res) => res.json());
  }

  static get(url: string, query: Record<string, string | number> = {}) {
    const queryParams = Object.entries(query)
      .map(([key, val]) => `${key}=${val}`)
      .join("&");

    return fetch(`${API_URL}/${url}${queryParams ? `?${queryParams}` : ""}`, {
      headers: API.getHeaders(),
      method: "GET",
    }).then((res) => res.json());
  }

  static delete(url: string) {
    return fetch(`${API_URL}/${url}`, {
      headers: API.getHeaders(),
      method: "DELETE",
    }).then((res) => res.json());
  }
}

export default API;
