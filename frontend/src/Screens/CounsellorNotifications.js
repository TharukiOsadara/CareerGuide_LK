import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { counsellorApi } from '../counsellor/api';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';

export default function CounsellorNotifications({ navigation }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems((await counsellorApi.notifications()).notifications || []); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}>
    <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.blue, marginBottom: 18 }}>‹ Back</Text></Pressable>
    <View style={styles.row}><View style={styles.flex}><Text style={styles.heading}>Notifications</Text><Text style={styles.subtitle}>Updates about your assigned students.</Text></View><Pressable onPress={() => counsellorApi.markAllNotificationsRead().then(load).catch((e) => setError(e.message))}><Text style={{ color: colors.blue }}>Mark all read</Text></Pressable></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}{loading && !items.length ? <ActivityIndicator color={colors.blue} /> : null}{!loading && !items.length ? <Text style={styles.muted}>No notifications.</Text> : null}
    {items.map((item) => <Pressable style={styles.card} key={item.id} onPress={() => item.inquiryId ? navigation.navigate('CounsellorNotificationDetail', { notificationId: item.id }) : counsellorApi.markNotificationRead(item.id).then(load).catch((e) => setError(e.message))}><View style={styles.row}><Text style={[styles.title, styles.flex]}>{item.title}</Text>{!item.read ? <View style={styles.chip}><Text style={styles.chipText}>NEW</Text></View> : null}</View><Text style={styles.muted}>{item.body}</Text>{item.courseTitle ? <Text style={styles.muted}>Course: {item.courseTitle}</Text> : null}{item.repliedByName ? <Text style={{ color: colors.blue, marginTop: 6 }}>Replied by {item.repliedByName}</Text> : null}<Text style={styles.muted}>{new Date(item.createdAt).toLocaleString()}</Text>{item.inquiryId ? <Text style={{ color: colors.blue, marginTop: 8 }}>Open inquiry and reply</Text> : null}<View style={styles.row}><Pressable style={[styles.button, { flex: 1, marginRight: 6 }]} onPress={() => counsellorApi.markNotificationRead(item.id).then(load).catch((e) => setError(e.message))}><Text style={styles.buttonText}>Mark read</Text></Pressable><Pressable style={[styles.button, styles.secondaryButton, { flex: 1, marginLeft: 6 }]} onPress={() => Alert.alert('Delete notification?', '', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => counsellorApi.deleteNotification(item.id).then(load).catch((e) => setError(e.message)) }])}><Text style={[styles.buttonText, styles.secondaryText]}>Delete</Text></Pressable></View></Pressable>)}
  </ScrollView></SafeAreaView>;
}
