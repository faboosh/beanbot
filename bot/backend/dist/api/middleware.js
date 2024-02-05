import "dotenv-esm/config";
import jwt from "jsonwebtoken";
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("jwt_secret not set in .env");
const authMiddleware = (req, res, next)=>{
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(" ")[1];
        jwt.verify(token, secret, (err, user)=>{
            if (err) {
                return res.sendStatus(403); // Forbidden access if the token is invalid
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401); // Unauthorized access if no token is provided
    }
};
export { authMiddleware };
