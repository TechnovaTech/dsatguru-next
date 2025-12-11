import { useState, useEffect } from "react";
import { FiEdit, FiToggleLeft, FiToggleRight, FiFilter } from "react-icons/fi";
import { getUsers, toggleUserStatus } from "../../services/api/admin";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      const data = await getUsers(filter || null);
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await toggleUserStatus(id);
      fetchUsers();
    } catch (error) {
      console.error("Failed to toggle user status:", error);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Users</option>
            <option value="Student">Students</option>
            <option value="Tutor">Tutors</option>
            <option value="Admin">Admins</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'Tutor' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <button
                    onClick={() => handleToggleStatus(user.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    {user.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;