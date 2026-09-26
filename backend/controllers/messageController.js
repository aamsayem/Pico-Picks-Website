/**
 * Message Controller
 * Handles Customer-to-Admin Support Chat System
 */

const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get chat messages for current authenticated customer
// @route   GET /api/messages
// @access  Private (Customer)
const getCustomerMessages = async (req, res) => {
    try {
        const customerId = req.user._id;

        const messages = await Message.find({ customer: customerId })
            .sort({ createdAt: 1 })
            .lean();

        // Mark any unread admin messages as read by this customer
        await Message.updateMany(
            { customer: customerId, senderRole: 'admin', isReadByCustomer: false },
            { $set: { isReadByCustomer: true } }
        );

        res.json(messages);
    } catch (error) {
        console.error('Error fetching customer messages:', error);
        res.status(500).json({ error: error.message || 'Failed to load messages' });
    }
};

// @desc    Customer sends a message to Admin Support
// @route   POST /api/messages
// @access  Private (Customer)
const sendCustomerMessage = async (req, res) => {
    try {
        const { text } = req.body;
        const trimmed = (text || '').trim();

        if (!trimmed) {
            return res.status(400).json({ error: 'Message text cannot be empty' });
        }

        const customer = req.user;
        const displayName = customer.name || customer.username || 'Customer';

        const newMessage = await Message.create({
            customer: customer._id,
            sender: customer._id,
            senderRole: 'customer',
            senderName: displayName,
            customerName: displayName,
            customerEmail: customer.email || '',
            text: trimmed,
            isReadByAdmin: false,
            isReadByCustomer: true
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Error sending customer message:', error);
        res.status(500).json({ error: error.message || 'Failed to send message' });
    }
};

// @desc    Customer marks all messages as read
// @route   PUT /api/messages/read
// @access  Private (Customer)
const markCustomerMessagesRead = async (req, res) => {
    try {
        await Message.updateMany(
            { customer: req.user._id, senderRole: 'admin', isReadByCustomer: false },
            { $set: { isReadByCustomer: true } }
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: error.message || 'Failed to update messages' });
    }
};

// @desc    Admin gets list of all customer conversations
// @route   GET /api/messages/conversations
// @access  Private (Admin)
const getAdminConversations = async (req, res) => {
    try {
        const conversations = await Message.aggregate([
            { $sort: { createdAt: 1 } },
            {
                $group: {
                    _id: "$customer",
                    lastMessage: { $last: "$text" },
                    lastSenderRole: { $last: "$senderRole" },
                    lastCreatedAt: { $last: "$createdAt" },
                    customerName: { $last: "$customerName" },
                    customerEmail: { $last: "$customerEmail" },
                    totalMessages: { $sum: 1 },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$senderRole", "customer"] },
                                        { $eq: ["$isReadByAdmin", false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { lastCreatedAt: -1 } }
        ]);

        // Augment with current user profile if available
        const enriched = await Promise.all(conversations.map(async (conv) => {
            if (conv._id && mongoose.Types.ObjectId.isValid(conv._id)) {
                const user = await User.findById(conv._id).select('username email name phone').lean();
                if (user) {
                    return {
                        ...conv,
                        customerName: user.name || user.username || conv.customerName,
                        customerEmail: user.email || conv.customerEmail,
                        customerPhone: user.phone || ''
                    };
                }
            }
            return conv;
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Error loading conversations for admin:', error);
        res.status(500).json({ error: error.message || 'Failed to load conversations' });
    }
};

// @desc    Admin gets full message history for a specific customer
// @route   GET /api/messages/customer/:customerId
// @access  Private (Admin)
const getAdminCustomerMessages = async (req, res) => {
    try {
        const { customerId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }

        const messages = await Message.find({ customer: customerId })
            .sort({ createdAt: 1 })
            .lean();

        // Mark messages from customer as read by admin
        await Message.updateMany(
            { customer: customerId, senderRole: 'customer', isReadByAdmin: false },
            { $set: { isReadByAdmin: true } }
        );

        res.json(messages);
    } catch (error) {
        console.error('Error loading customer messages for admin:', error);
        res.status(500).json({ error: error.message || 'Failed to load messages' });
    }
};

// @desc    Admin sends a reply to a specific customer
// @route   POST /api/messages/customer/:customerId
// @access  Private (Admin)
const adminReplyMessage = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { text } = req.body;
        const trimmed = (text || '').trim();

        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }

        if (!trimmed) {
            return res.status(400).json({ error: 'Reply text cannot be empty' });
        }

        const customer = await User.findById(customerId).lean();
        const adminUser = req.user;

        const newMessage = await Message.create({
            customer: customerId,
            sender: adminUser._id,
            senderRole: 'admin',
            senderName: adminUser.name || adminUser.username || 'Pico Picks Support',
            customerName: (customer && (customer.name || customer.username)) || 'Customer',
            customerEmail: (customer && customer.email) || '',
            text: trimmed,
            isReadByAdmin: true,
            isReadByCustomer: false
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Error sending admin reply:', error);
        res.status(500).json({ error: error.message || 'Failed to send reply' });
    }
};

// @desc    Admin marks messages from customer as read
// @route   PUT /api/messages/customer/:customerId/read
// @access  Private (Admin)
const markAdminMessagesRead = async (req, res) => {
    try {
        const { customerId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            return res.status(400).json({ error: 'Invalid customer ID' });
        }

        await Message.updateMany(
            { customer: customerId, senderRole: 'customer', isReadByAdmin: false },
            { $set: { isReadByAdmin: true } }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking admin messages read:', error);
        res.status(500).json({ error: error.message || 'Failed to update messages' });
    }
};

module.exports = {
    getCustomerMessages,
    sendCustomerMessage,
    markCustomerMessagesRead,
    getAdminConversations,
    getAdminCustomerMessages,
    adminReplyMessage,
    markAdminMessagesRead
};
