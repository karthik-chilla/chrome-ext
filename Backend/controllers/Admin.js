const User = require("../models/User");

async function getAnalytics(req, res) {
  try {
    const users = await User.find(
      {},
      {
        subscription: 1,
        summaryCount: 1,
        summaryHistory: 1,
        createdAt: 1,
      }
    );

    // Calculate user subscription stats
    const stats = {
      total: users.length,
      free: users.filter((u) => u.subscription === "free").length,
      basic: users.filter((u) => u.subscription === "basic").length,
      premium: users.filter((u) => u.subscription === "premium").length,
    };

    // Calculate summary statistics
    const totalSummaries = users.reduce(
      (acc, user) => acc + (user.summaryCount || 0),
      0
    );

    // Get summary history for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const summaryHistory = users.flatMap((user) =>
      (user.summaryHistory || []).filter(
        (s) => new Date(s.timestamp) > thirtyDaysAgo
      )
    );

    // Daily summary counts
    const dailySummaries = {};
    summaryHistory.forEach((summary) => {
      const date = new Date(summary.timestamp).toISOString().split("T")[0];
      dailySummaries[date] = (dailySummaries[date] || 0) + 1;
    });

    // Domain analytics
    const domainStats = {};
    summaryHistory.forEach((summary) => {
      if (summary.domain) {
        domainStats[summary.domain] = (domainStats[summary.domain] || 0) + 1;
      }
    });

    // Type analytics (short vs long)
    const typeStats = {
      short: summaryHistory.filter((s) => s.type === "short").length,
      long: summaryHistory.filter((s) => s.type === "long").length,
    };

    res.json({
      userStats: stats,
      summaryStats: {
        total: totalSummaries,
        daily: dailySummaries,
        domains: domainStats,
        types: typeStats,
      },
    });
  } catch (error) {
    //console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Error fetching analytics" });
  }
}

async function getUsers(req, res) {
  try {
    const users = await User.find(
      {},
      {
        password: 0,
        __v: 0,
      }
    ).sort({ createdAt: -1 });

    const stats = {
      total: users.length,
      free: users.filter((u) => u.subscription === "free").length,
      basic: users.filter((u) => u.subscription === "basic").length,
      premium: users.filter((u) => u.subscription === "premium").length,
    };

    res.json({ users, stats });
  } catch (error) {
    //console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
}

async function deleteUser(req, res) {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting super_admin
    if (user.role === "super_admin") {
      return res.status(403).json({ message: "Cannot delete Super Admin" });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    //console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
}

module.exports = {
  getAnalytics,
  getUsers,
  deleteUser,
};
