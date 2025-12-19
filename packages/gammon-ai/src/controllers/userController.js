"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const prisma_1 = require("../lib/prisma");
// Obtenir le profil de l'utilisateur connecté
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        // Récupérer les informations complètes de l'utilisateur
        const user = await prisma_1.prisma.users.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true
                // Ne pas inclure le mot de passe
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
};
exports.getProfile = getProfile;
// Mettre à jour le profil
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }
        const { username } = req.body;
        const updatedUser = await prisma_1.prisma.users.update({
            where: { id: req.user.id },
            data: { username },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true
            }
        });
        res.json({
            success: true,
            data: updatedUser
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=userController.js.map