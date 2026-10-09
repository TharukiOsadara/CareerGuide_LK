import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { counsellorApi } from '../counsellor/api';
import { colors } from '../styles/colors';
import { styles } from '../counsellor/styles';

export default function CounsellorInquiries({ navigation }) {
  const [items, setItems] = useState([]);
  const [reply, setReply] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]); const [courseId, setCourseId] = useState(''); const [isSenior, setIsSenior] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const query = courseId ? `courseId=${courseId}` : ''; const result = await counsellorApi.inquiries(query); setItems(result.inquiries || []); setIsSenior(result.isSenior === true); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [courseId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useFocusEffect(useCallback(() => { counsellorApi.courses().then((result) => setCourses(result.courses || [])).catch(() => {}); }, []));
  const sendReply = (item) => {
    if (!reply[item.id]?.trim()) return setError('Enter a reply before sending.');
    counsellorApi.replyInquiry(item.id, reply[item.id]).then(load).catch((e) => setError(e.message));
  };
  const removeReply = (item) => Alert.alert('Delete reply?', 'This removes the reply from the student view.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => counsellorApi.deleteInquiryReply(item.id).then(load).catch((e) => setError(e.message)) },
  ]);
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}>
      <Pressable onPress={() => navigation.goBack()}><Text style={{ color: colors.blue, marginBottom: 18 }}>‹ Back</Text></Pressable>
      <View style={styles.row}><View style={styles.flex}><Text style={styles.heading}>Student Inquiries</Text><Text style={styles.subtitle}>{isSenior ? 'All course inquiries' : 'Assigned course inquiries'}</Text></View>{isSenior ? <View style={[styles.chip, styles.reviewedChip]}><Text style={[styles.chipText, styles.reviewedText]}>SENIOR</Text></View> : null}</View>
      {isSenior ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 }}><Pressable onPress={() => setCourseId('')} style={[styles.chip, { margin: 3 }, !courseId && styles.reviewedChip]}><Text style={[styles.chipText, !courseId && styles.reviewedText]}>All Courses</Text></Pressable>{courses.map((course) => <Pressable key={course.id} onPress={() => setCourseId(String(course.id))} style={[styles.chip, { margin: 3 }, courseId === String(course.id) && styles.reviewedChip]}><Text style={[styles.chipText, courseId === String(course.id) && styles.reviewedText]}>{course.title}</Text></Pressable>)}</View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !items.length ? <ActivityIndicator color={colors.blue} /> : null}
      {!loading && !items.length ? <Text style={styles.muted}>No inquiries yet.</Text> : null}
      {items.map((item) => <View style={styles.card} key={item.id}>
        <Text style={styles.title}>{item.subject}</Text><Text style={styles.muted}>{item.studentName} · {item.courseTitle}</Text>
        <Text style={[styles.muted, { marginTop: 12 }]}>{item.message}</Text>
        {item.repliedByName ? <Text style={{ color: colors.blue, marginTop: 8 }}>Replied by {item.repliedByName}</Text> : null}
        {item.replyMessage ? <><Text style={[styles.muted, { marginTop: 12 }]}>Current reply</Text><Text style={styles.pathwayText}>{item.replyMessage}</Text><Pressable onPress={() => removeReply(item)}><Text style={{ color: '#B42318', marginTop: 10 }}>Delete reply</Text></Pressable></> : null}
        <TextInput value={reply[item.id] || ''} onChangeText={(value) => setReply((old) => ({ ...old, [item.id]: value }))} placeholder="Write a reply" style={[styles.search, { marginTop: 12, height: 70 }]} multiline placeholderTextColor={colors.muted} />
        <Pressable style={styles.button} onPress={() => sendReply(item)}><Text style={styles.buttonText}>{item.replyMessage ? 'Update Reply' : 'Reply'}</Text></Pressable>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
