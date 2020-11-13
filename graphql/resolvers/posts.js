const { AuthenticationError, UserInputError } = require('apollo-server')
const Post = require('../../models/Post')
const checkAuth = require('../../util/check-auth')

module.exports = {
    Query: {
        async getPosts() {
            try {
                const posts = await Post.find().sort({ createdAt: -1 });
                return posts;
            } catch (err) {
                throw new Error(err);
            }
        },
        async getPost(_, { postId }) {
            try {
                const post = await Post.findById(postId);
                if (post) {
                    return post;
                } else {
                    throw new Error('Post not found')
                }
            } catch (err) {
                throw new Error(err);
            }
        }
    },
    Mutation: {
        async createPost(_, { body }, context) {
            const user = checkAuth(context)
            console.log(user);

            if (body.trim() === '') {
                throw new Error('Post body must not be empty');
            }

            const newPost = new Post({
                body,
                user: user.id,
                username: user.username,
                createdAt: new Date().toISOString()
            });

            const post = await newPost.save();

            context.pubsub.publish('NEW_POST', {
                newPost: post
            })

            return post;
        },
        async deletePost(_, { postId }, context) {
            const user = checkAuth(context);

            try {
                const post = await Post.findById(postId)
                console.log(post.username)
                if (user.username === post.username) {
                    await post.delete();
                    return 'Post deleted successfully'
                }
                throw new AuthenticationError("Action not allowed")
            } catch (err) {
                throw new Error(err);
            }
        },
        async likePost(_, { postID }, context) {
            // console.log(context)
            const { username } = checkAuth(context)
            const post = await Post.findById(postID);
            if (post) {
                if (post.likes.find(like => like.username === username)) {
                    // Post already liked, unlike it
                    post.likes = post.likes.filter(like => like.username !== username)
                    await post.save();
                } else {
                    // Not liked, like it
                    post.likes.push({
                        username,
                        createdAt: new Date().toISOString()
                    })
                }

                await post.save();
                return post
            }
            throw new UserInputError('Post not found')
        }
    },
    Subscription: {
        newPost: {
            subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('NEW_POST')
        }
    }
}