from flask import Flask, request, jsonify
from predictors.genre import infer_genre

app = Flask(__name__)


@app.route("/infer-genre", methods=["POST"])
def infer_genre_endpoint():
    data = request.json
    file_path = data.get("filePath")

    if not file_path:
        return jsonify({"error": "No filePath provided"}), 400

    result = infer_genre(file_path)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
