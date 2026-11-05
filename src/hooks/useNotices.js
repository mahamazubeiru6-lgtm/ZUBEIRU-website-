import { useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';

export const useNotices = () => {
    const { authFetch } = useAuth();
    const { showToast } = useToast();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const fetchNotices = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            const queryString = new URLSearchParams(params).toString();
            const url = `/accounts/notices/${queryString ? `?${queryString}` : ''}`;
            const response = await authFetch(url);
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                setNotices(data.data || []);
                setTotalCount(data.count || 0);
                return data.data;
            } else {
                showToast(data.message || 'Failed to fetch notices', 'error');
                return [];
            }
        } catch (error) {
            console.error('Error fetching notices:', error);
            showToast('Network error. Please try again.', 'error');
            return [];
        } finally {
            setLoading(false);
        }
    }, [authFetch, showToast]);

    const createNotice = async (noticeData) => {
        try {
            setLoading(true);
            const response = await authFetch('/accounts/notices/', {
                method: 'POST',
                body: JSON.stringify(noticeData),
            });
            const data = await response.json();

            if (response.status === 201 && data.status === 'success') {
                showToast(data.message || 'Notice created successfully!', 'success');
                setNotices((current) => [data.data, ...current]);
                setTotalCount((current) => current + 1);
                return data.data;
            } else {
                if (data.errors) {
                    const firstError = Object.values(data.errors)[0];
                    showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                } else {
                    showToast(data.message || 'Failed to create notice', 'error');
                }
                return null;
            }
        } catch (error) {
            console.error('Error creating notice:', error);
            showToast('Network error. Please try again.', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const updateNotice = async (id, noticeData) => {
        try {
            setLoading(true);
            const response = await authFetch(`/accounts/notices/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(noticeData),
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showToast(data.message || 'Notice updated successfully!', 'success');
                setNotices((current) => current.map((notice) => (
                    notice.id === id ? data.data : notice
                )));
                return data.data;
            } else {
                if (data.errors) {
                    const firstError = Object.values(data.errors)[0];
                    showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                } else {
                    showToast(data.message || 'Failed to update notice', 'error');
                }
                return null;
            }
        } catch (error) {
            console.error('Error updating notice:', error);
            showToast('Network error. Please try again.', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const deleteNotice = async (id) => {
        try {
            setLoading(true);
            const response = await authFetch(`/accounts/notices/${id}/`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showToast(data.message || 'Notice deleted successfully!', 'success');
                setNotices((current) => current.filter((notice) => notice.id !== id));
                setTotalCount((current) => Math.max(0, current - 1));
                return true;
            } else {
                showToast(data.message || 'Failed to delete notice', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error deleting notice:', error);
            showToast('Network error. Please try again.', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const toggleDisplay = async (id) => {
        try {
            setLoading(true);
            const response = await authFetch(`/accounts/notices/${id}/toggle-display/`, {
                method: 'POST',
            });
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showToast(data.message || 'Notice display toggled successfully!', 'success');
                setNotices((current) => current.map((notice) => (
                    notice.id === id ? { ...notice, ...data.data } : notice
                )));
                return data.data;
            } else {
                showToast(data.message || 'Failed to toggle notice display', 'error');
                return null;
            }
        } catch (error) {
            console.error('Error toggling notice display:', error);
            showToast('Network error. Please try again.', 'error');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        notices,
        loading,
        totalCount,
        fetchNotices,
        createNotice,
        updateNotice,
        deleteNotice,
        toggleDisplay,
    };
};

