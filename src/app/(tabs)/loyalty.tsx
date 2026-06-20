import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { colors } from '@/constants/shinecraft-theme';
import { getApiErrorMessage } from '@/contexts/auth-context';
import { loyaltyApi } from '@/lib/api';
import type { LoyaltyAccount, LoyaltyTransaction, Reward } from '@/types';

export default function LoyaltyScreen() {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      const data = await Promise.all([loyaltyApi.getMyAccount(), loyaltyApi.getMyTransactions(), loyaltyApi.getRewards()]);
      setAccount(data[0]); setTransactions(data[1]); setRewards(data[2]);
    } catch (error) { Alert.alert('Loyalty', getApiErrorMessage(error)); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const task = Promise.resolve().then(load);
    return () => { void task; };
  }, []);
  const redeem = async (id: string) => { try { await loyaltyApi.redeem(id); await load(); } catch (error) { Alert.alert('Loyalty', getApiErrorMessage(error)); } };
  const tier = typeof account?.membershipTierId === 'object' ? account.membershipTierId : null;
  return <Screen>
    <Text style={s.title}>Loyalty</Text>
    {loading ? <ActivityIndicator color={colors.primary} size={'large'} /> : null}
    {account ? <>
      <View style={s.hero}><Text style={s.light}>DIEM KHA DUNG</Text><Text style={s.points}>{account.currentPoints}</Text><Text style={s.light}>Hang {tier?.name ?? '-'} - {tier?.discountPercent ?? 0}%</Text></View>
      <Text style={s.heading}>Phan thuong</Text>
      {rewards.map((item) => <View key={item._id} style={s.card}><Text style={s.cardTitle}>{item.name}</Text><Text style={s.muted}>{item.description}</Text><Text style={s.cost}>{item.requiredPoints} diem</Text><Pressable disabled={account.currentPoints < item.requiredPoints} onPress={() => void redeem(item._id)} style={s.button}><Text style={s.buttonText}>Doi thuong</Text></Pressable></View>)}
      <Text style={s.heading}>Lich su diem</Text>
      {transactions.map((item) => <View key={item._id} style={s.card}><Text style={s.cardTitle}>{item.type}: {item.points > 0 ? '+' : ''}{item.points}</Text><Text style={s.muted}>{item.description}</Text></View>)}
    </> : null}
  </Screen>;
}

const s = StyleSheet.create({title:{color:colors.ink,fontSize:30,fontWeight:'900'},hero:{padding:22,borderRadius:22,backgroundColor:colors.ink},light:{color:'#d0d5dd'},points:{color:'#fff',fontSize:40,fontWeight:'900'},heading:{color:colors.ink,fontSize:21,fontWeight:'900'},card:{padding:17,gap:8,borderRadius:17,backgroundColor:colors.surface},cardTitle:{color:colors.ink,fontWeight:'900'},muted:{color:colors.muted},cost:{color:colors.primary,fontWeight:'800'},button:{padding:13,alignItems:'center',borderRadius:12,backgroundColor:colors.primary},buttonText:{color:'#fff',fontWeight:'800'}});
