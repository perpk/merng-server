const Post = require('../../models/Post')
const { UserInputError } = require('apollo-server')
const { AuthenticationError } = require('apollo-server')

const checkAuth = require('../../util/check-auth')

module.exports = {
    Mutation: {
        createComment: async (_, { postId, body }, context) => {
            const { username } = checkAuth(context)
            if (body.trim() === '') {
                throw new UserInputError('Empty comment', {
                    errors: {
                        body: 'Comment body must not be empty'
                    }
                });
            }
            const post = await Post.findById(postId)

            if (post) {
                post.comments.unshift({
                    body,
                    createdAt: new Date().toISOString(),
                    username
                })
                await post.save();
                return post;
            }
            throw new UserInputError('Post was not found')
        },
        async deleteComment(_, { postId, commentId }, context) {
            const { username } = checkAuth(context);

            const post = await Post.findById(postId)

            if (post) {
                const commentIndex = post.comments.findIndex(c => c.id === commentId);

                if (post.comments[commentIndex].username === username) {
                    post.comments.splice(commentIndex, 1);
                    await post.save();
                    return post
                }
                throw new AuthenticationError('Action not allowed')
            }
            throw new UserInputError('Post not found')
        }
    }
}