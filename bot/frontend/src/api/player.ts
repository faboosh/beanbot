import API from "./api";

class PlayerAPI {
  static pause() {
    return API.post("playback/pause");
  }

  static unpause() {
    return API.post("playback/unpause");
  }

  static skip() {
    return API.post("playback/skip");
  }

  static search(query: string) {
    return API.get("search", { search: query });
  }

  static videoDetails(id: string) {
    return API.get(`videos/${id}`);
  }

  static queue(id: string) {
    return API.post(`queue/${id}`);
  }

  static removeFromQueue(id: string) {
    return API.delete(`queue/${id}`);
  }

  // static seekTo(seconds: number) {}

  static getUsersWhoPlayed(id: string) {
    return API.get(`videos/${id}/played-by`);
  }

  static getUserDetails(id: string) {
    return API.get(`users/${id}`);
  }
}

export default PlayerAPI;
