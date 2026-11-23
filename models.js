"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

const productSchema = new Schema({
    _id: { type: String, trim: true, required: true, maxlength: 20 },
    name: { type: String, trim: true, required: true, maxlength: 200 },
    description: { type: String, trim: true, required: true, maxlength: 500 },
    category: { type: String, trim: true, required: true, maxlength: 100 },
    price: { type: Number, required: true, min: 0.01 }
}, { timestamps: true, versionKey: false });

const proposalSchema = new Schema({
    title: { type: String, trim: true, required: true, minlength: 5, maxlength: 120 },
    abstract: { type: String, trim: true, required: true, minlength: 30, maxlength: 3000 },
    speaker: { type: String, trim: true, required: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 254 },
    category: { type: String, trim: true, required: true, maxlength: 60 },
    format: { type: String, trim: true, required: true, maxlength: 40 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    decisionAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

const attendeeSchema = new Schema({
    fullName: { type: String, trim: true, required: true, maxlength: 100 },
    age: { type: Number, required: true, min: 1, max: 120 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 254, unique: true },
    phone: { type: String, trim: true, default: "", maxlength: 30 },
    address: { type: String, trim: true, required: true, maxlength: 250 }
}, { timestamps: true, versionKey: false });

const sessionSchema = new Schema({
    _id: { type: String, trim: true, required: true, maxlength: 20 },
    description: { type: String, trim: true, required: true, maxlength: 200 },
    category: { type: String, trim: true, required: true, maxlength: 100 },
    unitOfMeasure: { type: String, trim: true, required: true, maxlength: 60 },
    price: { type: Number, required: true, min: 0 },
    additionalInfo: { type: String, trim: true, default: "", maxlength: 300 }
}, { timestamps: true, versionKey: false });

const registrationSchema = new Schema({
    fullName: { type: String, trim: true, required: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, required: true, maxlength: 254 },
    participationType: { type: String, enum: ["in-person", "virtual", "vip"], required: true },
    selectedSessions: [{
        id: { type: String, required: true },
        title: { type: String, required: true },
        track: { type: String, default: "" },
        format: { type: String, required: true }
    }]
}, { timestamps: true, versionKey: false });

const cartSchema = new Schema({
    _id: { type: String, required: true, maxlength: 64 },
    items: [{
        productId: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1, max: 20 }
    }]
}, { timestamps: true, versionKey: false });

const addressSchema = new Schema({
    line1: { type: String, required: true, maxlength: 150 },
    line2: { type: String, default: "", maxlength: 150 },
    city: { type: String, required: true, maxlength: 80 },
    region: { type: String, required: true, maxlength: 80 },
    postalCode: { type: String, required: true, maxlength: 20 },
    country: { type: String, required: true, maxlength: 80 }
}, { _id: false });

const billingSchema = new Schema({
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 254 },
    address: { type: addressSchema, required: true },
    payment: {
        method: { type: String, enum: ["card"], required: true },
        last4: { type: String, match: /^\d{4}$/, required: true }
    },
    items: [{
        productId: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, min: 1, max: 20, required: true },
        unitPrice: { type: Number, min: 0, required: true }
    }],
    subtotal: { type: Number, min: 0, required: true },
    shippingMethod: { type: String, enum: ["standard", "pickup"], required: true },
    shippingAmount: { type: Number, min: 0, required: true },
    total: { type: Number, min: 0, required: true }
}, { timestamps: true, versionKey: false });

const shippingSchema = new Schema({
    billingId: { type: Schema.Types.ObjectId, ref: "Billing", required: true, unique: true },
    recipientName: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 254 },
    address: { type: addressSchema, required: true },
    method: { type: String, enum: ["standard", "pickup"], required: true },
    amount: { type: Number, min: 0, required: true }
}, { timestamps: true, versionKey: false });

const returnSchema = new Schema({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productImage: { type: String, required: true },
    price: { type: Number, min: 0, required: true },
    email: { type: String, required: true, maxlength: 254 },
    reason: { type: String, required: true, maxlength: 500 },
    condition: { type: String, enum: ["unopened", "opened", "damaged"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true, versionKey: false });

const models = {
    Product: mongoose.model("Product", productSchema, "products"),
    Proposal: mongoose.model("Proposal", proposalSchema, "proposals"),
    Attendee: mongoose.model("Attendee", attendeeSchema, "attendees"),
    ConferenceSession: mongoose.model("ConferenceSession", sessionSchema, "sessions"),
    Registration: mongoose.model("Registration", registrationSchema, "registrations"),
    Cart: mongoose.model("Cart", cartSchema, "carts"),
    Billing: mongoose.model("Billing", billingSchema, "billings"),
    Shipping: mongoose.model("Shipping", shippingSchema, "shippings"),
    ReturnRequest: mongoose.model("ReturnRequest", returnSchema, "returns")
};

module.exports = models;
