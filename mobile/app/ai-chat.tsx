import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '../src/constants/theme';
import { Product } from '../src/types/product';
import { fetchAIChat } from '../src/services/apiClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  isGrounded?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'Is this suitable for daily consumption?',
  'What are the key ingredients to watch out for?',
  'Is the sugar level high for an Indian diet?',
  'Are the food additives/INS numbers safe?',
];

export default function AIChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productJson?: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (params.productJson) {
      try {
        const parsed: Product = JSON.parse(params.productJson);
        setProduct(parsed);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: `Hello! I am your NutriLens AI assistant. Ask me anything about ${parsed.product_name} (${parsed.brand || 'Brand unspecified'}). I will answer strictly based on verified nutrition facts and ICMR-NIN / FSSAI guidelines.`,
            isGrounded: true,
          },
        ]);
      } catch (e) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: 'Hello! Ask me any nutritional question about packaged foods. I am grounded in verified facts and Indian dietary guidelines.',
            isGrounded: true,
          },
        ]);
      }
    } else {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: 'Hello! I am your NutriLens AI assistant. Ask any question about packaged food nutrition, FSSAI regulations, or ICMR-NIN dietary guidelines.',
          isGrounded: true,
        },
      ]);
    }
  }, [params.productJson]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || question;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setQuestion('');
    setLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 100);

    const prodPayload: Product = product || {
      barcode: 'unknown',
      product_name: 'General Product',
      source: 'local',
      cached: false,
      nutrients_per_100g: {},
    };

    const res = await fetchAIChat(prodPayload, textToSend.trim());
    setLoading(false);

    if (res.success && res.data) {
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.data.answer,
        modelUsed: res.data.model_used,
        isGrounded: res.data.is_grounded,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } else {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: res.error || 'Sorry, I could not process your question. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setTimeout(() => scrollViewRef.current?.scrollToEnd?.({ animated: true }), 150);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>✨ NutriLens AI Assistant</Text>
            <Text style={styles.headerSubtitle}>Grounded in ICMR-NIN & FSSAI Context</Text>
          </View>
        </View>

        {/* Product Info Banner */}
        {product && (
          <View style={styles.productBanner}>
            <Text style={styles.productBannerEmoji}>🥫</Text>
            <View style={styles.productBannerDetails}>
              <Text style={styles.productBannerTitle} numberOfLines={1}>
                {product.product_name}
              </Text>
              {product.brand && (
                <Text style={styles.productBannerBrand} numberOfLines={1}>
                  {product.brand}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Chat Messages List */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {msg.text}
              </Text>
              {msg.role === 'assistant' && msg.isGrounded && (
                <View style={styles.groundedPill}>
                  <Text style={styles.groundedPillText}>✓ Verified Fact Grounded</Text>
                </View>
              )}
            </View>
          ))}

          {loading && (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingRow]}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Gemini AI is analyzing...</Text>
            </View>
          )}
        </ScrollView>

        {/* Suggested Question Chips */}
        {messages.length <= 2 && (
          <View style={styles.chipsContainer}>
            <Text style={styles.chipsLabel}>Suggested Questions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <TouchableOpacity
                  key={`chip-${idx}`}
                  style={styles.chipButton}
                  onPress={() => handleSend(q)}
                >
                  <Text style={styles.chipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask AI a question about this product..."
            placeholderTextColor={Colors.textMuted}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!question.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!question.trim() || loading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backButton: {
    paddingRight: Spacing.sm,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitleGroup: {
    flex: 1,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  productBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    gap: 10,
  },
  productBannerEmoji: {
    fontSize: 22,
  },
  productBannerDetails: {
    flex: 1,
  },
  productBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  productBannerBrand: {
    fontSize: 11,
    color: Colors.primaryDark,
  },
  chatScrollContent: {
    padding: Spacing.md,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 2,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  groundedPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  groundedPillText: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chipButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  chipText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
