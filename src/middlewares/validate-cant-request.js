import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 15 * 60 * 10000,
    max: 1000,
    message: {
        success: false,
        msg: "Too many requests from this IP, please try again after 15 minutes"
    }
})

export default limiter;