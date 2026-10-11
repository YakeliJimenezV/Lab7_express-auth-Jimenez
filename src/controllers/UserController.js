import userService from '../services/UserService.js';

class UserController {
    async getAll(req, res, next) {
        try {
            res.status(200).json(await userService.getAll());
        } catch (err) { next(err); }
    }

    async getMe(req, res, next) {
        try {
            res.status(200).json(await userService.getById(req.userId));
        } catch (err) { next(err); }
    }

    async getById(req, res, next) {
        try {
            res.status(200).json(await userService.getById(req.params.id));
        } catch (err) { next(err); }
    }

    async updateMe(req, res, next) {
        try {
            res.status(200).json(await userService.updateMe(req.userId, req.body));
        } catch (err) { next(err); }
    }
}

export default new UserController();