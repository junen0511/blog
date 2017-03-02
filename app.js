let path = require('path'),
	express = require('express'),
	session = require('express-session'),
	MongoStore = require('connect-mongo')(session),
	flash = require('connect-flash'),
	config = require('config-lite'),
	formidable = require('express-formidable'),
	routers = require('./routes'),
	pkg = require('./package'),
	winston = require('winston'),
	expressWinston = require('express-winston'),
	app = express();

// 设置模板路径
app.set('views', path.join(__dirname, 'views'));

// 设置模板引擎
app.set('view engine', 'ejs');

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'static')));

// 设置中间件
app.use(session({
	name: config.session.key, //设置 cookie 中，保存 session id 字段
	secret: config.session.secret, // 通过设置 secret 来计算 hash 值并放在cookie中，使产生的signedCookie防篡改
	resave: true, //强制更新cookie
	saveUninitialized: false, //设置为false，强制为用户创建 session,即使用户未登录
	cookie: {
		maxAge: config.session.maxAge //过期时间，过期后 cookie中session id自动清除 
	},
	store: new MongoStore({ //将sesion存储到mongodb
		url: config.mongodb //mogondb地址
	})

}));

// flash中间件 用来显示通知
app.use(flash());

// 处理表单及文件上传的中间件
app.use(formidable({
	uploadDir: path.join(__dirname, 'static/img'),
	keepExtensions: true //保留后缀
}));

// 设置模板全局常量
app.locals.blog = {
	title: pkg.name,
	description: pkg.description
};

// 添加模板必需的三个变量
app.use((req, res, next) => {
	res.locals.user = req.session.user;
	res.locals.success = req.flash('success').toString();
	res.locals.error = req.flash('error').toString();
	next();
});

// 正常日志捕捉
app.use(expressWinston.logger({
	transports: [
		new(winston.transports.Console)({
			json: true,
			colorize: true
		}),
		new winston.transports.File({
			filename: 'logs/success.log'
		})
	]
}));

// 路由
routers(app);

// 异常日志捕捉
app.use(expressWinston.errorLogger({
	transports: [
		new winston.transports.Console({
			json: true,
			colorize: true
		}),
		new winston.transports.File({
			filename: 'logs/error.log'
		})
	]
}));


if (module.parent) {
	module.exports = app;
} else {
	// 监听启动程序
	app.listen(config.port, () => {
		console.log(`${pkg.name} listening on port ${config.port}`);
	});
}