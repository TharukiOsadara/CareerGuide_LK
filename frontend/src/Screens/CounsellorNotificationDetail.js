import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { counsellorApi } from '../counsellor/api';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';

export default function CounsellorNotificationDetail({ route, navigation }) {
  const notificationId = route?.params?.notificationId;
  const [inquiry, setInquiry] = useState(null); const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!notificationId) { setError('No notification was selected.'); setLoading(false); return; }
    setLoading(true); setError('');
    try { const response = await counsellorApi.notificationDetail(notificationId); setInquiry(response.inquiry); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [notificationId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const submit = async () => {
    if (!message.trim()) return setError('Reply cannot be empty.');
    if (message.trim().length > 4000) return setError('Reply must be 4000 characters or fewer.');
    setSaving(true); setError('');
    try {
      if (editingId) await counsellorApi.editNotificationReply(notificationId, editingId, message);
      else await counsellorApi.replyToNotification(notificationId, message);
      setMessage(''); setEditingId(null); await load(); Alert.alert('Reply sent', 'The student has been notified.');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const remove = (replyId) => Alert.alert('Delete reply?', 'This removes your reply from the thread.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { await counsellorApi.deleteNotificationReply(notificationId, replyId); await load(); } catch (e) { setError(e.message); } } },
  ]);
  if (!notificationId) return <SafeAreaView style={styles.screen}><View style={styles.content}><Text style={styles.error}>No notification was selected.</Text><Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.blue }}>Back</Text></Pressable></View></SafeAreaView>;
  if (loading && !inquiry) return <SafeAreaView style={styles.screen}><ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /></SafeAreaView>;
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}>
      <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.blue, marginBottom: 18 }}>‹ Back</Text></Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!inquiry ? <Text style={styles.muted}>This notification has no replyable inquiry.</Text> : <>
        <Text style={styles.heading}>{inquiry.subject}</Text><Text style={styles.subtitle}>{inquiry.studentName} · {inquiry.courseTitle}</Text>
        <View style={styles.card}><Text style={styles.muted}>{inquiry.message}</Text><Text style={styles.muted}>{new Date(inquiry.createdAt).toLocaleString()}</Text></View>
        <Text style={styles.sectionTitle}>Reply thread</Text>
        <View style={styles.card}>
          {inquiry.replies?.length ? inquiry.replies.map((reply) => <View key={reply.id} style={[styles.pathway, reply.authorRole === 'counsellor' && { backgroundColor: colors.blueLight }]}>
            <Text style={styles.studentName}>{reply.authorRole === 'counsellor' ? 'You' : inquiry.studentName}</Text><Text style={styles.muted}>{reply.body}</Text><Text style={styles.muted}>{new Date(reply.updatedAt || reply.createdAt).toLocaleString()}</Text>
            {reply.authorRole === 'counsellor' ? <View style={styles.row}><Pressable onPress={() => { setEditingId(reply.id); setMessage(reply.body); }}><Text style={{ color: colors.blue, marginRight: 16 }}>Edit</Text></Pressable><Pressable onPress={() => remove(reply.id)}><Text style={{ color: '#B42318' }}>Delete</Text></Pressable></View> : null}
          </View>) : <Text style={styles.muted}>No replies yet.</Text>}
        </View>
        <TextInput multiline value={message} onChangeText={setMessage} placeholder={editingId ? 'Edit your reply' : 'Write a reply'} placeholderTextColor={colors.muted} style={styles.input} />
        <Pressable style={styles.button} disabled={saving} onPress={submit}><Text style={styles.buttonText}>{saving ? 'Sending...' : editingId ? 'Update Reply' : 'Send Reply'}</Text></Pressable>
        {editingId ? <Pressable onPress={() => { setEditingId(null); setMessage(''); }}><Text style={{ color: colors.blue, textAlign: 'center', marginTop: 12 }}>Cancel edit</Text></Pressable> : null}
      </>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
