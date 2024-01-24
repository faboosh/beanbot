import { getToken } from "../token";
const API_URL = "http://localhost:3000/api/v1";
class PlayerAPI {
  private static getHeaders() {
    return {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    };
  }

  private static post(url: string) {
    return fetch(`${API_URL}/${url}`, {
      headers: PlayerAPI.getHeaders(),
      method: "POST",
    }).then((res) => res.json());
  }

  private static get(url: string, query: Record<string, string | number> = {}) {
    const queryParams = Object.entries(query)
      .map(([key, val]) => `${key}=${val}`)
      .join("&");

    return fetch(`${API_URL}/${url}${queryParams ? `?${queryParams}` : ""}`, {
      headers: PlayerAPI.getHeaders(),
      method: "GET",
    }).then((res) => res.json());
  }

  static pause() {
    return PlayerAPI.post("playback/pause");
  }

  static unpause() {
    return PlayerAPI.post("playback/unpause");
  }

  static skip() {
    return PlayerAPI.post("playback/skip");
  }

  static search(query: string) {
    return PlayerAPI.get("search", { search: query });
  }

  static videoDetails(id: string) {
    return PlayerAPI.get(`videos/${id}`);
  }

  static queue(id: string) {
    return PlayerAPI.post(`queue/${id}`);
  }
}

export default PlayerAPI;
