let fs = require('fs'),
	path = require('path'),
	sha1 = require('sha1'),
	express = require('express'),
	router = express.Router();


let UserModel = require('../models/users');
let checkNotLogin = require('../middlewares/check').checkNotLogin;

// GET /signup 注册页
router.get('/', checkNotLogin, (req, res, next) => {
	res.render('signup');
});

// POST /signup 用户注册
router.post('/', checkNotLogin, (req, res, next) => {
	let name = req.fields.name,
		gender = req.fields.gender,
		bio = req.fields.bio,
		avatar = req.files.avatar.path.split(path.sep).pop(),
		password = req.fields.password,
		repassword = req.fields.repassword;

	// 校验参数
	try {
		if (!(name.length >= 1 && name.length <= 10)) {
			throw new Error('名字请限制在1-10个字符');
		}
		if (!(gender in ['m', 'f', 'x'])) {
			throw new Error('性别只能是m，f或x');
		}
		if (!(bio.length >= 1 && bio.length <= 30)) {
			throw new Error('个人简介请限制在1-30个字符');
		}
		if (!req.files.avatar.name) {
			throw new Error('缺少头像');
		}
		if (password.length < 6) {
			throw new Error('密码至少 6 个字符');
		}
		if (password !== repassword) {
			throw new Error('两次输入的密码不一致');
		}
	} catch (e) {
		// 注册失败，异步删除上传的头像
		fs.unlink(req.files.avatar.path);
		req.flash('error', e.message);
		return res.redirect('./signup');
	}

	// 明文密码加密
	password = sha1(password);

	// 待写入数据库的用户信息
	let user = {
		name,
		password,
		gender,
		bio,
		avatar
	}

	// 用户信息写入数据库
	UserModel.create(user).then((result) => {
		// 此 user 是插入 mogodb 后的值，包含_id
		user = result.ops[0];
		// 将用户信息存入 session
		delete user.password;
		req.session.user = user;
		// 写入flash
		req.flash('success', '注册成功');
		// 跳转到首页
		res.redirect('./posts');
	}).catch((e) => {
		// 注册失败，异步删除上传头像
		fs.unlink(req.files.avatar.path);
		// 用户名被占用则跳回注册页，而不是错误页
		if (e.message.match('E11000 duplicate key')) {
			req.flash('error', '用户名已被占用');
			return res.redirect('./signup');
		}
		next(e);
	});
});

module.exports = router;