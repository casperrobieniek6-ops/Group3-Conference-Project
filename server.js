"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const root = __dirname;
const dataDirectory = path.join(root, ".data");
const port = Number(process.env.PORT) || 3000;
const pendingWrites = new Map();
const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8"
};

function sendJson(response, status, payload) {
    response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });
    response.end(JSON.stringify(payload));
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        let tooLarge = false;
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
            if (tooLarge) {
                return;
            }
            body += chunk;
            if (Buffer.byteLength(body) > 1024 * 1024) {
                tooLarge = true;
                reject(Object.assign(new Error("Request body must be smaller than 1 MB."), { status: 413 }));
            }
        });
        request.on("end", () => {
            if (tooLarge) {
                return;
            }
            try {
                const payload = JSON.parse(body);
                if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
                    throw new Error("Request body must be a JSON object.");
                }
                resolve(payload);
            } catch {
                reject(Object.assign(new Error("Request body must contain a valid JSON object."), { status: 400 }));
            }
        });
        request.on("error", (error) => {
            if (!tooLarge) {
                reject(error);
            }
        });
    });
}

async function loadCollection(name) {
    try {
        const content = await fs.readFile(path.join(dataDirectory, name), "utf8");
        const records = JSON.parse(content);
        if (!Array.isArray(records)) {
            throw new Error(`${name} must contain a JSON array.`);
        }
        return records;
    } catch (error) {
        if (error.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}

async function updateCollection(name, update) {
    const filePath = path.join(dataDirectory, name);
    const previousWrite = pendingWrites.get(name) || Promise.resolve();
    let result;
    const nextWrite = previousWrite.catch(() => {}).then(async () => {
        const records = await loadCollection(name);
        result = await update(records);
        await fs.mkdir(dataDirectory, { recursive: true });
        const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
        await fs.writeFile(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
        await fs.rename(temporaryPath, filePath);
    });
    pendingWrites.set(name, nextWrite);
    try {
        await nextWrite;
        return result;
    } finally {
        if (pendingWrites.get(name) === nextWrite) {
            pendingWrites.delete(name);
        }
    }
}

function text(value, maxLength) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validationError(message) {
    return Object.assign(new Error(message), { status: 400 });
}

async function readProducts() {
    const data = JSON.parse(await fs.readFile(path.join(root, "products.json"), "utf8"));
    if (!data || !Array.isArray(data.products)) {
        throw new Error("products.json must contain a products array.");
    }
    return data.products;
}

async function handleApi(request, response, url) {
    if (url.pathname === "/api/products" && request.method === "GET") {
        sendJson(response, 200, { products: await readProducts() });
        return;
    }

    if (url.pathname === "/api/proposals" && request.method === "GET") {
        let proposals = await loadCollection("proposals.json");
        const status = url.searchParams.get("status");
        if (status) {
            proposals = proposals.filter((proposal) => proposal.status === status);
        }
        sendJson(response, 200, { proposals });
        return;
    }

    if (url.pathname === "/api/proposals" && request.method === "POST") {
        const input = await readBody(request);
        const proposal = {
            title: text(input.title, 120),
            abstract: text(input.abstract, 3000),
            speaker: text(input.speaker, 100),
            email: text(input.email, 254).toLowerCase(),
            category: text(input.category, 60),
            format: text(input.format, 40)
        };
        if (!proposal.title || proposal.title.length < 5
            || !proposal.abstract || proposal.abstract.length < 30
            || !proposal.speaker || !validEmail(proposal.email)
            || !proposal.category || !proposal.format) {
            throw validationError("Provide a title, an abstract of at least 30 characters, speaker, valid email, category, and format.");
        }

        const savedProposal = await updateCollection("proposals.json", (proposals) => {
            const record = {
                id: crypto.randomUUID(),
                ...proposal,
                status: "pending",
                createdAt: new Date().toISOString(),
                decisionAt: null
            };
            proposals.push(record);
            return record;
        });
        sendJson(response, 201, { proposal: savedProposal });
        return;
    }

    const proposalMatch = url.pathname.match(/^\/api\/proposals\/([0-9a-f-]+)$/i);
    if (proposalMatch && request.method === "PATCH") {
        const input = await readBody(request);
        if (input.status !== "approved" && input.status !== "rejected") {
            throw validationError("Proposal status must be approved or rejected.");
        }
        const proposal = await updateCollection("proposals.json", (proposals) => {
            const record = proposals.find((item) => item.id === proposalMatch[1]);
            if (!record) {
                return null;
            }
            record.status = input.status;
            record.decisionAt = new Date().toISOString();
            return record;
        });
        if (!proposal) {
            sendJson(response, 404, { error: "Proposal not found." });
            return;
        }
        sendJson(response, 200, { proposal });
        return;
    }

    if (url.pathname === "/api/billing" && request.method === "POST") {
        const input = await readBody(request);
        if (input.cardNumber !== undefined || input.securityCode !== undefined || input.cvv !== undefined) {
            throw validationError("Do not send full card numbers or security codes. Submit only the payment method and last four digits.");
        }
        const name = text(input.name, 100);
        const email = text(input.email, 254).toLowerCase();
        const addressInput = input.address && typeof input.address === "object" ? input.address : {};
        const address = {
            line1: text(addressInput.line1, 150),
            line2: text(addressInput.line2, 150),
            city: text(addressInput.city, 80),
            region: text(addressInput.region, 80),
            postalCode: text(addressInput.postalCode, 20),
            country: text(addressInput.country, 80)
        };
        const payment = input.payment && typeof input.payment === "object" ? input.payment : {};
        const order = input.order && typeof input.order === "object" ? input.order : {};
        if (!name || !validEmail(email)
            || !address.line1 || !address.city || !address.region || !address.postalCode || !address.country
            || payment.method !== "card" || !/^\d{4}$/.test(String(payment.last4 || ""))
            || !Array.isArray(order.items) || order.items.length === 0 || order.items.length > 50
            || order.items.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
            throw validationError("Provide valid contact, billing address, masked payment, and at least one order item.");
        }

        const products = await readProducts();
        const orderItems = order.items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            const quantity = Number(item.quantity);
            if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
                throw validationError("Order contains an unknown product or invalid quantity.");
            }
            return {
                productId: product.id,
                name: product.name,
                quantity,
                unitPrice: Number(product.price)
            };
        });
        const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const shipping = order.shipping === "pickup" ? 0 : order.shipping === "standard" ? 8 : null;
        if (shipping === null || Number(order.subtotal) !== Number(subtotal.toFixed(2))
            || Number(order.shippingAmount) !== shipping
            || Number(order.total) !== Number((subtotal + shipping).toFixed(2))) {
            throw validationError("Order totals or shipping selection do not match the current product prices.");
        }

        const savedOrder = await updateCollection("orders.json", (orders) => {
            const record = {
                id: crypto.randomUUID(),
                name,
                email,
                address,
                payment: { method: "card", last4: String(payment.last4) },
                items: orderItems,
                subtotal: Number(subtotal.toFixed(2)),
                shippingAmount: shipping,
                total: Number((subtotal + shipping).toFixed(2)),
                createdAt: new Date().toISOString()
            };
            orders.push(record);
            return record;
        });
        sendJson(response, 201, {
            order: { id: savedOrder.id, total: savedOrder.total, payment: savedOrder.payment },
            message: "Demo order recorded. No payment was charged."
        });
        return;
    }

    if (url.pathname === "/api/returns" && request.method === "POST") {
        const input = await readBody(request);
        const productId = text(input.productId, 20);
        const reason = text(input.reason, 500);
        const condition = text(input.condition, 40);
        const email = text(input.email, 254).toLowerCase();
        const allowedConditions = ["unopened", "opened", "damaged"];
        if (!productId || !reason || reason.length < 10 || !allowedConditions.includes(condition) || !validEmail(email)) {
            throw validationError("Provide a valid product, email, reason of at least 10 characters, and product condition.");
        }
        const products = await readProducts();
        const product = products.find((candidate) => candidate.id === productId);
        if (!product) {
            throw validationError("Select a product from the current conference catalog.");
        }

        const savedReturn = await updateCollection("returns.json", (returns) => {
            const record = {
                id: crypto.randomUUID(),
                productId: product.id,
                productName: product.name,
                productImage: "/assets/product-placeholder.svg",
                price: Number(product.price),
                email,
                reason,
                condition,
                createdAt: new Date().toISOString()
            };
            returns.push(record);
            return record;
        });
        sendJson(response, 201, { returnRequest: savedReturn });
        return;
    }

    sendJson(response, 404, { error: "API endpoint not found." });
}

async function serveStatic(request, response, url) {
    if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { error: "Method not allowed." });
        return;
    }
    let pathname;
    try {
        pathname = decodeURIComponent(url.pathname);
    } catch {
        sendJson(response, 400, { error: "Invalid URL path." });
        return;
    }
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, relativePath);
    const relativeToRoot = path.relative(root, filePath);
    if (!relativeToRoot || relativeToRoot.startsWith("..")
        || path.isAbsolute(relativeToRoot)
        || relativeToRoot === "server.js"
        || relativeToRoot.split(path.sep).some((segment) => segment.startsWith("."))) {
        sendJson(response, 404, { error: "File not found." });
        return;
    }
    try {
        const content = await fs.readFile(filePath);
        const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
        response.writeHead(200, {
            "Content-Type": contentType,
            "X-Content-Type-Options": "nosniff"
        });
        response.end(request.method === "HEAD" ? undefined : content);
    } catch (error) {
        if (error.code === "ENOENT" || error.code === "EISDIR") {
            sendJson(response, 404, { error: "File not found." });
            return;
        }
        throw error;
    }
}

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    try {
        if (url.pathname.startsWith("/api/")) {
            await handleApi(request, response, url);
        } else {
            await serveStatic(request, response, url);
        }
    } catch (error) {
        if (!response.headersSent) {
            sendJson(response, error.status || 500, {
                error: error.status ? error.message : "The server could not process the request."
            });
        } else {
            response.destroy(error);
        }
        if (!error.status) {
            console.error(error);
        }
    }
});

server.listen(port, () => {
    console.log(`CyberSec Summit demo server is running at http://localhost:${port}`);
});
