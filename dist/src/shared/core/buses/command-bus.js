"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBus = void 0;
class CommandBus {
    async execute(handler, command) {
        return handler.execute(command);
    }
}
exports.CommandBus = CommandBus;
