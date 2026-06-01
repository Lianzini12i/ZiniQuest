import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { hapticSuccess, hapticError, hapticLight } from '../../utils/haptics';

const AVATAR_ICONS = {
  avatar_1: { icon: 'account-circle',     color: colors.primary },
  avatar_2: { icon: 'account-cowboy-hat', color: colors.accent },
  avatar_3: { icon: 'account-star',       color: colors.success },
  avatar_4: { icon: 'robot-excited',      color: colors.info },
  avatar_5: { icon: 'alien',              color: colors.error },
  avatar_6: { icon: 'ninja',              color: '#8B5CF6' },
};

const ROLES        = ['student', 'instructor', 'admin'];
const ROLE_COLORS  = { student: colors.primary, instructor: colors.info, admin: colors.error };
const ROLE_FILTERS = ['all', 'student', 'instructor', 'admin'];

export default function ManageUsersScreen({ navigation }) {
  const [users, setUsers]           = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
      setFiltered(data);
    } catch (e) {
      console.warn('Failed to load users:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [searchQuery, roleFilter, users]);

  const onRefresh = () => { setRefreshing(true); loadUsers(); };

  const handleChangeRole = (user) => {
    Alert.alert(
      'Change Role',
      `Change role for ${user.name}`,
      ROLES.map(role => ({
        text:  role.charAt(0).toUpperCase() + role.slice(1),
        style: role === 'admin' ? 'destructive' : 'default',
        onPress: async () => {
          if (role === user.role) return;
          setUpdatingId(user.id);
          try {
            await updateDoc(doc(db, 'users', user.id), { role });
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u));
            await hapticSuccess();
          } catch (e) {
            console.warn('Role update failed:', e.message);
            await hapticError();
          } finally {
            setUpdatingId(null);
          }
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleSuspend = (user) => {
    Alert.alert(
      'Suspend User',
      `Are you sure you want to suspend ${user.name}? This will prevent them from logging in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(user.id);
            try {
              await updateDoc(doc(db, 'users', user.id), { suspended: true });
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended: true } : u));
              await hapticSuccess();
            } catch (e) {
              console.warn('Suspend failed:', e.message);
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Delete Account',
      `This will permanently delete ${user.name}'s account and all their data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(user.id);
            try {
              await deleteDoc(doc(db, 'users', user.id));
              setUsers(prev => prev.filter(u => u.id !== user.id));
              await hapticSuccess();
            } catch (e) {
              console.warn('Delete failed:', e.message);
              await hapticError();
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item: user }) => {
    const avatarMeta  = AVATAR_ICONS[user.avatar] || AVATAR_ICONS.avatar_1;
    const roleColor   = ROLE_COLORS[user.role]    || colors.textSecondary;
    const isUpdating  = updatingId === user.id;

    return (
      <Surface style={[styles.userCard, user.suspended && styles.userCardSuspended]} elevation={2}>
        <View style={styles.userCardTop}>
          <View style={[styles.avatarCircle, { backgroundColor: avatarMeta.color + '22' }]}>
            <MaterialCommunityIcons name={avatarMeta.icon} size={26} color={avatarMeta.color} />
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text variant="bodyLarge" style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              {user.suspended && (
                <View style={styles.suspendedChip}>
                  <Text variant="labelSmall" style={styles.suspendedText}>Suspended</Text>
                </View>
              )}
            </View>
            <Text variant="labelSmall" style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <View style={styles.userMeta}>
              <View style={[styles.rolePill, { backgroundColor: roleColor + '22' }]}>
                <Text variant="labelSmall" style={[styles.roleText, { color: roleColor }]}>
                  {user.role}
                </Text>
              </View>
              <Text variant="labelSmall" style={styles.metaText}>
                Lv.{user.level || 1} · {user.xp || 0} XP
              </Text>
            </View>
          </View>
          {isUpdating && <ActivityIndicator size={20} color={colors.primary} />}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.info }]}
            onPress={() => { hapticLight(); handleChangeRole(user); }}
            disabled={isUpdating}
          >
            <MaterialCommunityIcons name="account-convert" size={16} color={colors.info} />
            <Text variant="labelSmall" style={[styles.actionBtnText, { color: colors.info }]}>
              Change Role
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.accent }]}
            onPress={() => { hapticLight(); handleSuspend(user); }}
            disabled={isUpdating || user.suspended}
          >
            <MaterialCommunityIcons name="account-lock" size={16} color={colors.accent} />
            <Text variant="labelSmall" style={[styles.actionBtnText, { color: colors.accent }]}>
              Suspend
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.error }]}
            onPress={() => { hapticLight(); handleDelete(user); }}
            disabled={isUpdating}
          >
            <MaterialCommunityIcons name="trash-can" size={16} color={colors.error} />
            <Text variant="labelSmall" style={[styles.actionBtnText, { color: colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </Surface>
    );
  };

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={colors.error} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.error} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <View>
                <Text variant="headlineMedium" style={styles.headerTitle}>Manage Users</Text>
                <Text variant="bodySmall" style={styles.headerSub}>
                  {users.length} total users
                </Text>
              </View>
            </View>

            <Searchbar
              placeholder="Search by name or email..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              inputStyle={{ color: colors.textPrimary }}
              iconColor={colors.textSecondary}
              placeholderTextColor={colors.textSecondary}
              theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
            />

            {/* Role filters */}
            <View style={styles.filterRow}>
              {ROLE_FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, roleFilter === f && styles.filterChipActive]}
                  onPress={() => { hapticLight(); setRoleFilter(f); }}
                >
                  <Text variant="labelSmall" style={[
                    styles.filterChipText,
                    roleFilter === f && styles.filterChipTextActive,
                  ]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={renderUser}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.centred}>
            <MaterialCommunityIcons name="account-off" size={48} color={colors.textSecondary} />
            <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>No users found</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 60 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  centred: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.textPrimary, fontWeight: 'bold' },
  headerSub: { color: colors.textSecondary },
  searchBar: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, elevation: 0, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.error, borderColor: colors.error },
  filterChipText: { color: colors.textSecondary },
  filterChipTextActive: { color: colors.white, fontWeight: 'bold' },
  userCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  userCardSuspended: { borderColor: colors.accent + '44', backgroundColor: colors.accent + '08' },
  userCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { color: colors.textPrimary, fontWeight: '600', flex: 1 },
  userEmail: { color: colors.textSecondary },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontWeight: 'bold', textTransform: 'capitalize' },
  metaText: { color: colors.textSecondary },
  suspendedChip: { backgroundColor: colors.accent + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  suspendedText: { color: colors.accent, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, borderWidth: 1, backgroundColor: colors.background },
  actionBtnText: { fontWeight: 'bold' },
});