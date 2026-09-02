const { z } = require('zod');

const triageSchema = z.object({

    category: z.enum(["billing", "bug", "feature", "other"]),
    urgency: z.enum(["low", "normal", "high"]),
    confidence: z.number().min(0).max(1),
    reason: z.string()
});

module.exports = triageSchema;