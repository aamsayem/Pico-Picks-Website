/**
 * Message Express Routes
 * Handles Customer-to-Admin Support Chat
 */

const express = require('express');
const router = express.Router();
const {
    getCustomerMessages,
    sendCustomerMessage,
    markCustomerMessagesRead,
    getAdminConversations,
    getAdminCustomerMessages,
    adminReplyMessage,
    markAdminMessagesRead
} = require('../controllers/messageController');
const { protect, adminOnly } = require('../middleware/auth');

// Customer routes (authenticated customer)
router.get('/', protect, getCustomerMessages);
router.post('/', protect, sendCustomerMessage);
router.put('/read', protect, markCustomerMessagesRead);

// Admin routes (restricted to administrator)
router.get('/conversations', protect, adminOnly, getAdminConversations);
router.get('/customer/:customerId', protect, adminOnly, getAdminCustomerMessages);
router.post('/customer/:customerId', protect, adminOnly, adminReplyMessage);
router.put('/customer/:customerId/read', protect, adminOnly, markAdminMessagesRead);

module.exports = router;
