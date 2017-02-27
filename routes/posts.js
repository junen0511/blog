let express = require('express'),
	router = express.Router(),
	PostModel = require('../models/posts'),
	CommentModel = require('../models/comments'),
	checkLogin = require('../middlewares/check').checkLogin;

// GET/posts 所有用户或者特定用户的文章页
// eg:GET /posts?author=xxx
router.get('/', (req, res, next) => {
	let author = req.query.author;
	PostModel.getPosts(author)
		.then((posts) => {
			res.render('posts', {
				posts
			});
		})
		.catch(next);
});

// POST /posts 发表一篇文章
router.post('/', checkLogin, (req, res, next) => {
	let author = req.session.user._id,
		title = req.fields.title,
		content = req.fields.content,
		pv = 0;

	// 校验参数
	try {
		if (!title.length) {
			throw new Error('请填写标题');
		}
		if (!content.length) {
			throw new Error('请填写内容');
		}
	} catch (e) {
		req.flash('error', e.message);
		return res.redirect('back');
	}

	let post = {
		author,
		title,
		content,
		pv
	}

	PostModel.create(post)
		.then((result) => {
			// 此post是插入 mongodb 后的值，包含 _id
			post = result.ops[0];
			req.flash('success', '发表成功');
			// 发表成功后跳转到该文章页
			res.redirect(`/posts/${post._id}`);
		})
		.catch(next);
});

// GET /posts/create 发表文章页
router.get('/create', checkLogin, (req, res, next) => {
	res.render('create');
});

// GET /posts/:postId 单独一篇的文章页
router.get('/:postId', (req, res, next) => {
	let postId = req.params.postId;
	Promise.all([
			PostModel.getPostById(postId), // 获取文章信息
			CommentModel.getComments(postId), //获取该文章所有留言
			PostModel.incPv(postId) //pv 加 1
		])
		.then((result) => {
			let post = result[0],
				comments = result[1];
			if (!post) {
				throw new Error('该文章不在地球');
			}

			res.render('post', {
				post,
				comments
			});
		})
		.catch(next);
});

// GET /posts/:postId/edit 更新文章页
router.get('/:postId/edit', checkLogin, (req, res, next) => {
	let postId = req.params.postId,
		author = req.session.user._id;

	PostModel.getRawPostById(postId)
		.then((post) => {
			if (!post) {
				throw new Error('该文章不在地球');
			}
			if (author.toString() !== post.author._id.toString()) {
				throw new Error('权限不足');
			}
			res.render('edit', {
				post
			});
		})
		.catch(next);
});

// POST /posts/:postId/edit 更新一篇文章
router.post('/:postId/edit', checkLogin, (req, res, next) => {
	let postId = req.params.postId,
		author = req.session.user._id,
		title = req.fields.title,
		content = req.fields.content;

	PostModel.updatePostById(postId, author, {
			title,
			content
		})
		.then(() => {
			req.flash('success', '编辑文章成功');
			// 编辑成功后跳转到上一页
			res.redirect(`/posts/${postId}`);
		})
		.catch(next);
});

// GET /posts/:postId/remove 删除一篇文章
router.get('/:postId/remove', checkLogin, (req, res, next) => {
	let postId = req.params.postId,
		author = req.session.user._id;

	PostModel.delPostById(postId, author)
		.then(() => {
			req.flash('success', '删除文章成功');
			// 删除成功后跳转到主页
			res.redirect('/posts');
		})
		.catch(next);

});

// POST /posts/:postId/comment 创建一条留言
router.post('/:postId/comment', checkLogin, (req, res, next) => {
	let author = req.session.user._id,
		postId = req.params.postId,
		content = req.fields.content;

	// 校验留言内容
	try {
		if (!content.length) {
			throw new Error('请填写留言');
		}
	} catch (e) {
		req.flash('error', e.message);
		return res.redirect('back');
	}

	let comment = {
		author,
		postId,
		content
	};

	CommentModel.create(comment)
		.then((comment) => {
			req.flash('success', '留言成功');
			// 留言成功后跳转到上一页
			res.redirect('back');
		})
		.catch(next);
});

// GET /posts/:postId/comment/:commentId/remove 创建一条留言
router.get('/:postId/comment/:commentId/remove', checkLogin, (req, res, next) => {
	let commentId = req.params.commentId,
		author = req.session.user._id;
	CommentModel.delCommentById(commentId, author)
		.then(() => {
			req.flash('success', '删除留言成功');
			// 删除成功后跳转到上一页
			res.redirect('back');
		})
		.catch(next);
});

module.exports = router;