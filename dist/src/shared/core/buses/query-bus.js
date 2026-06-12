"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBus = void 0;
class QueryBus {
    async execute(handler, query) {
        return handler.execute(query);
    }
}
exports.QueryBus = QueryBus;
