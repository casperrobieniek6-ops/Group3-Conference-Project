"use strict";

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const fs = require("node:fs/promises");
const path = require("node:path");
const {
    Product,
    Proposal,
    Attendee,
    ConferenceSession,
    Registration,
    Cart,
    Billing,
    Shipping,
    ReturnRequest
} = require("./models");

const app = express();
const publicDirectory = path.join(__dirname, "public");
const port = Number(process.env.PORT) || 3000;
const databaseUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cybersec_summit";
const models = [Product, Proposal, Attendee, ConferenceSession, Registration, Cart, Billing, Shipping, ReturnRequest];

function httpError(status, message) {
    return Object.assign(new Error(message), { status });
}

function text(value, maxLength) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function objectBody(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw httpError(400, "Request body must be a JSON object.");
    }
    return value;
}

function record(document) {
    const value = document.toObject ? document.toObject() : document;
    const { _id, __v, ...fields } = value;
    return { ...fields, id: String(_id) };
}

function productInput(input, id) {
    input = objectBody(input);
    const product = {
        _id: id || text(input.id, 20),
        name: text(input.name, 200),
        description: text(input.description, 500),
        category: text(input.category, 100),
        price: Number(input.price)
    };
    if (!product._id || !product.name || !product.description || !product.category
        || !Number.isFinite(product.price) || product.price <= 0) {
        throw httpError(400, "Provide a product ID, name, description, category, and price greater than zero.");
    }
    return product;
}

function proposalInput(input) {
    input = objectBody(input);
    const proposal = {
        title: text(input.title, 120),
        abstract: text(input.abstract, 3000),
        speaker: text(input.speaker, 100),
        email: text(input.email, 254).toLowerCase(),
        category: text(input.category, 60),
        format: text(input.format, 40)
    };
    if (proposal.title.length < 5 || proposal.abstract.length < 30 || !proposal.speaker
        || !validEmail(proposal.email) || !proposal.category || !proposal.format) {
        throw httpError(400, "Provide a title, an abstract of at least 30 characters, speaker, valid email, category, and format.");
    }
    return proposal;
}

function attendeeInput(input) {
    input = objectBody(input);
    const attendee = {
        fullName: text(input.fullName, 100),
        age: Number(input.age),
        email: text(input.email, 254).toLowerCase(),
        phone: text(input.phone, 30),
        address: text(input.address, 250)
    };
    const phoneDigits = attendee.phone.replace(/\D/g, "");
    if (attendee.fullName.split(/\s+/).filter(Boolean).length < 2
        || !Number.isInteger(attendee.age) || attendee.age < 1 || attendee.age > 120
        || !validEmail(attendee.email) || !attendee.address
        || (attendee.phone && (!/^[+\d\s().-]+$/.test(attendee.phone)
            || phoneDigits.length < 7 || phoneDigits.length > 15))) {
        throw httpError(400, "Provide a full name, valid age and email, address, and a valid optional phone number.");
    }
    return attendee;
}

function sessionInput(input, id) {
    input = objectBody(input);
    const session = {
        _id: id || text(input.productId || input.id, 20),
        description: text(input.description || input.title, 200),
        category: text(input.category || input.track, 100),
        unitOfMeasure: text(input.unitOfMeasure || input.format, 60),
        price: Number(input.price),
        additionalInfo: text(input.additionalInfo || input.details, 300)
    };
    if (!session._id || !session.description || !session.category || !session.unitOfMeasure
        || !Number.isFinite(session.price) || session.price < 0) {
        throw httpError(400, "Provide a session ID, title, track, format, and non-negative price.");
    }
    return session;
}

function sessionRecord(document) {
    const value = record(document);
    return { ...value, productId: value.id, title: value.description, format: value.unitOfMeasure };
}

async function registrationInput(input) {
    input = objectBody(input);
    const fullName = text(input.fullName, 100);
    const email = text(input.email, 254).toLowerCase();
    const participationType = input.participationType;
    const selected = input.selectedSessions;
    if (fullName.split(/\s+/).filter(Boolean).length < 2 || !validEmail(email)
        || !["in-person", "virtual", "vip"].includes(participationType)
        || !Array.isArray(selected) || selected.length < 1 || selected.length > 20) {
        throw httpError(400, "Provide attendee name, valid email, participation type, and at least one session.");
    }
    const ids = selected.map((session) => text(session && (session.id || session.productId), 20));
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
        throw httpError(400, "Selected session IDs must be valid and unique.");
    }
    const sessions = await ConferenceSession.find({ _id: { $in: ids } }).lean();
    if (sessions.length !== ids.length) {
        throw httpError(400, "One or more selected sessions are no longer available.");
    }
    const byId = new Map(sessions.map((session) => [session._id, session]));
    return {
        fullName,
        email,
        participationType,
        selectedSessions: ids.map((id) => {
            const session = byId.get(id);
            return {
                id,
                title: session.description,
                track: session.category,
                format: session.unitOfMeasure
            };
        })
    };
}

function cartIdIsValid(id) {
    return /^[a-zA-Z0-9_-]{16,64}$/.test(id);
}

async function cartRecord(cart) {
    const products = await Product.find({
        _id: { $in: cart.items.map((item) => item.productId) }
    }).lean();
    const productMap = new Map(products.map((product) => [product._id, product]));
    return {
        id: cart._id,
        items: cart.items.flatMap((item) => {
            const product = productMap.get(item.productId);
            return product
                ? [{ productId: product._id, name: product.name, price: product.price, quantity: item.quantity }]
                : [];
        })
    };
}

async function cartItemsInput(input) {
    input = objectBody(input);
    if (!Array.isArray(input.items) || input.items.length > 50) {
        throw httpError(400, "Cart items must be an array containing no more than 50 products.");
    }
    const items = input.items.map((item) => ({
        productId: text(item && (item.productId || item.id), 20),
        quantity: Number(item && item.quantity)
    }));
    if (items.some((item) => !item.productId || !Number.isInteger(item.quantity)
        || item.quantity < 1 || item.quantity > 20)
        || new Set(items.map((item) => item.productId)).size !== items.length) {
        throw httpError(400, "Each cart item must have a unique product ID and quantity from 1 to 20.");
    }
    const found = await Product.countDocuments({ _id: { $in: items.map((item) => item.productId) } });
    if (found !== items.length) {
        throw httpError(400, "Cart contains a product that is not in the current catalog.");
    }
    return items;
}

function addressInput(value) {
    const address = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
        line1: text(address.line1, 150),
        line2: text(address.line2, 150),
        city: text(address.city, 80),
        region: text(address.region, 80),
        postalCode: text(address.postalCode, 20),
        country: text(address.country, 80)
    };
}

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/products", async (request, response) => {
    const products = await Product.find().sort({ _id: 1 }).lean();
    response.json({ products: products.map(record) });
});

app.post("/api/products", async (request, response) => {
    response.status(201).json({ product: record(await Product.create(productInput(request.body))) });
});

app.get("/api/products/:id", async (request, response) => {
    const product = await Product.findById(request.params.id);
    if (!product) throw httpError(404, "Product not found.");
    response.json({ product: record(product) });
});

app.put("/api/products/:id", async (request, response) => {
    const product = await Product.findByIdAndUpdate(
        request.params.id, productInput(request.body, request.params.id), { new: true, runValidators: true }
    );
    if (!product) throw httpError(404, "Product not found.");
    response.json({ product: record(product) });
});

app.delete("/api/products/:id", async (request, response) => {
    const result = await Product.deleteOne({ _id: request.params.id });
    if (!result.deletedCount) throw httpError(404, "Product not found.");
    response.status(204).end();
});

app.get("/api/proposals", async (request, response) => {
    const filter = {};
    if (request.query.status) {
        if (!["pending", "approved", "rejected"].includes(request.query.status)) {
            throw httpError(400, "Proposal status must be pending, approved, or rejected.");
        }
        filter.status = request.query.status;
    }
    const proposals = await Proposal.find(filter).sort({ createdAt: -1 });
    response.json({ proposals: proposals.map(record) });
});

app.post("/api/proposals", async (request, response) => {
    response.status(201).json({ proposal: record(await Proposal.create(proposalInput(request.body))) });
});

app.get("/api/proposals/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Proposal not found.");
    const proposal = await Proposal.findById(request.params.id);
    if (!proposal) throw httpError(404, "Proposal not found.");
    response.json({ proposal: record(proposal) });
});

app.put("/api/proposals/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Proposal not found.");
    const proposal = await Proposal.findByIdAndUpdate(
        request.params.id, proposalInput(request.body), { new: true, runValidators: true }
    );
    if (!proposal) throw httpError(404, "Proposal not found.");
    response.json({ proposal: record(proposal) });
});

app.patch("/api/proposals/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Proposal not found.");
    const input = objectBody(request.body);
    if (input.status !== "approved" && input.status !== "rejected") {
        throw httpError(400, "Proposal status must be approved or rejected.");
    }
    const proposal = await Proposal.findByIdAndUpdate(
        request.params.id, { status: input.status, decisionAt: new Date() }, { new: true, runValidators: true }
    );
    if (!proposal) throw httpError(404, "Proposal not found.");
    response.json({ proposal: record(proposal) });
});

app.delete("/api/proposals/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Proposal not found.");
    const result = await Proposal.deleteOne({ _id: request.params.id });
    if (!result.deletedCount) throw httpError(404, "Proposal not found.");
    response.status(204).end();
});

app.get("/api/attendees", async (request, response) => {
    const attendees = await Attendee.find().sort({ createdAt: -1 });
    response.json({ attendees: attendees.map(record) });
});

app.post("/api/attendees", async (request, response) => {
    response.status(201).json({ attendee: record(await Attendee.create(attendeeInput(request.body))) });
});

app.get("/api/attendees/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Attendee not found.");
    const attendee = await Attendee.findById(request.params.id);
    if (!attendee) throw httpError(404, "Attendee not found.");
    response.json({ attendee: record(attendee) });
});

app.put("/api/attendees/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Attendee not found.");
    const attendee = await Attendee.findByIdAndUpdate(
        request.params.id, attendeeInput(request.body), { new: true, runValidators: true }
    );
    if (!attendee) throw httpError(404, "Attendee not found.");
    response.json({ attendee: record(attendee) });
});

app.delete("/api/attendees/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Attendee not found.");
    const result = await Attendee.deleteOne({ _id: request.params.id });
    if (!result.deletedCount) throw httpError(404, "Attendee not found.");
    response.status(204).end();
});

app.get("/api/sessions", async (request, response) => {
    const sessions = await ConferenceSession.find().sort({ _id: 1 });
    response.json({ sessions: sessions.map(sessionRecord) });
});

app.post("/api/sessions", async (request, response) => {
    response.status(201).json({
        session: sessionRecord(await ConferenceSession.create(sessionInput(request.body)))
    });
});

app.get("/api/sessions/:id", async (request, response) => {
    const session = await ConferenceSession.findById(request.params.id);
    if (!session) throw httpError(404, "Session not found.");
    response.json({ session: sessionRecord(session) });
});

app.put("/api/sessions/:id", async (request, response) => {
    const session = await ConferenceSession.findByIdAndUpdate(
        request.params.id, sessionInput(request.body, request.params.id), { new: true, runValidators: true }
    );
    if (!session) throw httpError(404, "Session not found.");
    response.json({ session: sessionRecord(session) });
});

app.delete("/api/sessions/:id", async (request, response) => {
    const result = await ConferenceSession.deleteOne({ _id: request.params.id });
    if (!result.deletedCount) throw httpError(404, "Session not found.");
    response.status(204).end();
});

app.get("/api/registrations", async (request, response) => {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    response.json({ registrations: registrations.map(record) });
});

app.post("/api/registrations", async (request, response) => {
    const registration = await Registration.create(await registrationInput(request.body));
    response.status(201).json({ registration: record(registration) });
});

app.get("/api/registrations/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Registration not found.");
    const registration = await Registration.findById(request.params.id);
    if (!registration) throw httpError(404, "Registration not found.");
    response.json({ registration: record(registration) });
});

app.put("/api/registrations/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Registration not found.");
    const registration = await Registration.findByIdAndUpdate(
        request.params.id, await registrationInput(request.body), { new: true, runValidators: true }
    );
    if (!registration) throw httpError(404, "Registration not found.");
    response.json({ registration: record(registration) });
});

app.delete("/api/registrations/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Registration not found.");
    const result = await Registration.deleteOne({ _id: request.params.id });
    if (!result.deletedCount) throw httpError(404, "Registration not found.");
    response.status(204).end();
});

app.get("/api/carts/:id", async (request, response) => {
    if (!cartIdIsValid(request.params.id)) throw httpError(400, "Cart ID is invalid.");
    const cart = await Cart.findById(request.params.id);
    if (!cart) throw httpError(404, "Cart not found.");
    response.json({ cart: await cartRecord(cart) });
});

app.put("/api/carts/:id", async (request, response) => {
    if (!cartIdIsValid(request.params.id)) throw httpError(400, "Cart ID is invalid.");
    const items = await cartItemsInput(request.body);
    const cart = await Cart.findByIdAndUpdate(
        request.params.id, { $set: { items: items } }, { new: true, upsert: true, runValidators: true }
    );
    response.json({ cart: await cartRecord(cart) });
});

app.delete("/api/carts/:id", async (request, response) => {
    if (!cartIdIsValid(request.params.id)) throw httpError(400, "Cart ID is invalid.");
    await Cart.deleteOne({ _id: request.params.id });
    response.status(204).end();
});

app.get("/api/billing", async (request, response) => {
    const billings = await Billing.find().sort({ createdAt: -1 });
    response.json({ billings: billings.map(record) });
});

app.post("/api/billing", async (request, response) => {
    const input = objectBody(request.body);
    if (input.cardNumber !== undefined || input.securityCode !== undefined || input.cvv !== undefined) {
        throw httpError(400, "Do not send full card numbers or security codes. Submit only the payment method and last four digits.");
    }
    const name = text(input.name, 100);
    const email = text(input.email, 254).toLowerCase();
    const address = addressInput(input.address);
    const payment = input.payment && typeof input.payment === "object" ? input.payment : {};
    const order = input.order && typeof input.order === "object" ? input.order : {};
    const cartId = text(input.cartId, 64);
    if (!cartIdIsValid(cartId) || !name || !validEmail(email) || !address.line1 || !address.city
        || !address.region || !address.postalCode || !address.country || payment.method !== "card"
        || !/^\d{4}$/.test(String(payment.last4 || ""))) {
        throw httpError(400, "Provide valid contact, billing address, masked payment, and a valid cart.");
    }
    const cart = await Cart.findById(cartId);
    if (!cart || !cart.items.length) throw httpError(400, "The database cart is empty or no longer exists.");

    const products = await Product.find({ _id: { $in: cart.items.map((item) => item.productId) } }).lean();
    const orderItems = cart.items.map((item) => {
        const product = products.find((candidate) => candidate._id === item.productId);
        if (!product) throw httpError(400, "Cart contains a product that is no longer available.");
        return { productId: product._id, name: product.name, quantity: item.quantity, unitPrice: product.price };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const shippingMethod = order.shipping;
    const shippingAmount = shippingMethod === "pickup" ? 0 : shippingMethod === "standard" ? 8 : null;
    if (shippingAmount === null || (order.subtotal !== undefined
        && Number(order.subtotal) !== Number(subtotal.toFixed(2)))
        || (order.shippingAmount !== undefined && Number(order.shippingAmount) !== shippingAmount)
        || (order.total !== undefined && Number(order.total) !== Number((subtotal + shippingAmount).toFixed(2)))) {
        throw httpError(400, "Order totals or shipping selection do not match the current database cart.");
    }

    const billing = await Billing.create({
        name,
        email,
        address,
        payment: { method: "card", last4: String(payment.last4) },
        items: orderItems,
        subtotal: Number(subtotal.toFixed(2)),
        shippingMethod,
        shippingAmount,
        total: Number((subtotal + shippingAmount).toFixed(2))
    });
    await Shipping.create({
        billingId: billing._id,
        recipientName: name,
        email,
        address,
        method: shippingMethod,
        amount: shippingAmount
    });
    cart.items = [];
    await cart.save();
    response.status(201).json({
        order: { id: String(billing._id), total: billing.total, payment: billing.payment.toObject() },
        message: "Demo order recorded. No payment was charged."
    });
});

app.get("/api/shipping", async (request, response) => {
    const shippingRecords = await Shipping.find().sort({ createdAt: -1 });
    response.json({ shipping: shippingRecords.map(record) });
});

app.get("/api/returns", async (request, response) => {
    const returns = await ReturnRequest.find().sort({ createdAt: -1 });
    response.json({ returns: returns.map(record) });
});

app.post("/api/returns", async (request, response) => {
    const input = objectBody(request.body);
    const productId = text(input.productId, 20);
    const reason = text(input.reason, 500);
    const condition = text(input.condition, 40);
    const email = text(input.email, 254).toLowerCase();
    if (!productId || reason.length < 10 || !["unopened", "opened", "damaged"].includes(condition) || !validEmail(email)) {
        throw httpError(400, "Provide a valid product, email, reason of at least 10 characters, and product condition.");
    }
    const product = await Product.findById(productId).lean();
    if (!product) throw httpError(400, "Select a product from the current conference catalog.");
    response.status(201).json({
        returnRequest: record(await ReturnRequest.create({
            productId: product._id,
            productName: product.name,
            productImage: "/assets/product-placeholder.svg",
            price: product.price,
            email,
            reason,
            condition
        }))
    });
});

app.get("/api/returns/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Return request not found.");
    const returnRequest = await ReturnRequest.findById(request.params.id);
    if (!returnRequest) throw httpError(404, "Return request not found.");
    response.json({ returnRequest: record(returnRequest) });
});

app.patch("/api/returns/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Return request not found.");
    const input = objectBody(request.body);
    if (!["pending", "approved", "rejected"].includes(input.status)) {
        throw httpError(400, "Return status must be pending, approved, or rejected.");
    }
    const returnRequest = await ReturnRequest.findByIdAndUpdate(
        request.params.id, { status: input.status }, { new: true, runValidators: true }
    );
    if (!returnRequest) throw httpError(404, "Return request not found.");
    response.json({ returnRequest: record(returnRequest) });
});

app.delete("/api/returns/:id", async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) throw httpError(404, "Return request not found.");
    const result = await ReturnRequest.deleteOne({ _id: request.params.id });
    if (!result.deletedCount) throw httpError(404, "Return request not found.");
    response.status(204).end();
});

app.use("/api", (request, response) => {
    response.status(404).json({ error: "API endpoint not found." });
});

app.use(express.static(publicDirectory));

app.use((error, request, response, next) => {
    if (response.headersSent) {
        next(error);
        return;
    }
    const status = error.status
        || (error.type === "entity.parse.failed" ? 400 : 0)
        || (error.name === "ValidationError" ? 400 : 0)
        || (error.code === 11000 ? 409 : 0)
        || 500;
    if (status === 500) console.error(error);
    response.status(status).json({
        error: status === 500 ? "The server could not process the request." : error.message
    });
});

async function seedCollection(Model, fileName, key, transform) {
    if (await Model.estimatedDocumentCount() !== 0) return;
    const data = JSON.parse(await fs.readFile(path.join(publicDirectory, fileName), "utf8"));
    if (!data || !Array.isArray(data[key])) {
        throw new Error(`public/${fileName} must contain a ${key} array.`);
    }
    await Model.insertMany(data[key].map((item) => transform(item)));
}

async function start() {
    await mongoose.connect(databaseUri);
    await Promise.all(models.map((model) => model.init()));
    await seedCollection(Product, "products.json", "products", productInput);
    await seedCollection(ConferenceSession, "sessions.json", "sessions", sessionInput);
    app.listen(port, () => {
        console.log(`CyberSec Summit server is running at http://localhost:${port}`);
        console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);
    });
}

start().catch((error) => {
    console.error("Could not start the server or initialize MongoDB:", error);
    process.exitCode = 1;
});
