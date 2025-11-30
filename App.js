// App.js
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Stack = createNativeStackNavigator();

/* ---------- LOGIN SCREEN ---------- */
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    navigation.replace("BookList", { userEmail: email });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.appTitle}>My Reading Log</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title="Login" onPress={handleLogin} />
      </View>
    </View>
  );
}

/* ---------- BOOK LIST SCREEN ---------- */
function BookListScreen({ route, navigation, books, setBooks }) {
  const { userEmail } = route.params || {};
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("Recent");

  const totalBooks = books.length;
  const totalPages = books.reduce(
    (sum, book) => sum + (book.totalPages || 0),
    0
  );

  const readingCount = books.filter((b) => b.status === "Reading").length;
  const finishedCount = books.filter((b) => b.status === "Finished").length;
  const wantCount = books.filter((b) => b.status === "Want to read").length;

  // Sort books according to sortOption
  const sortedBooks = [...books].sort((a, b) => {
    if (sortOption === "Title") {
      return (a.title || "").localeCompare(b.title || "");
    }
    if (sortOption === "Pages") {
      return (b.totalPages || 0) - (a.totalPages || 0);
    }
    if (sortOption === "Rating") {
      return (b.rating || 0) - (a.rating || 0);
    }
    // Recent (default) – newest first
    const aTime = a.createdAt || 0;
    const bTime = b.createdAt || 0;
    return bTime - aTime;
  });

  // Filter by status
  const filteredByStatus =
    statusFilter === "All"
      ? sortedBooks
      : sortedBooks.filter(
          (b) => (b.status || "Status not set") === statusFilter
        );

  // Filter by search (title or author)
  const visibleBooks = filteredByStatus.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      (b.title || "").toLowerCase().includes(q) ||
      (b.author || "").toLowerCase().includes(q)
    );
  });

  function handleDelete(book) {
    Alert.alert(
      "Delete book",
      `Are you sure you want to remove "${book.title}" from your log?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            setBooks((prev) => prev.filter((b) => b.id !== book.id)),
        },
      ]
    );
  }

  function handleLogout() {
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  }

  function renderBookItem({ item }) {
    const rating = typeof item.rating === "number" ? item.rating : 0;
    const filledStars = "★".repeat(rating);
    const emptyStars = "☆".repeat(5 - rating);

    const total = item.totalPages || 0;
    const read = Math.min(item.pagesRead || 0, total);
    const percent =
      total > 0 ? Math.round((read / total) * 100) : 0;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("EditBook", { book: item })}
        onLongPress={() => handleDelete(item)}
        delayLongPress={400}
      >
        <View style={styles.bookItem}>
          <Text style={styles.bookTitle}>{item.title}</Text>
          <Text style={styles.bookAuthor}>
            {item.author || "Unknown author"}
          </Text>

          {rating > 0 && (
            <Text style={styles.bookRating}>
              {filledStars}
              {emptyStars} ({rating}/5)
            </Text>
          )}

          <Text style={styles.bookStatus}>
            {item.status ? item.status : "Status not set"}
          </Text>
          <Text style={styles.bookPages}>
            {total ? `${total} pages` : "Pages not set"}
          </Text>

          {total > 0 && (
            <Text style={styles.bookProgress}>
              Progress: {read}/{total} pages ({percent}%)
            </Text>
          )}

          {item.description ? (
            <Text style={styles.bookDescription}>{item.description}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.appTitle}>My Reading Log</Text>
      {userEmail ? (
        <Text style={styles.subtitle}>Logged in as: {userEmail}</Text>
      ) : null}

      <View style={styles.logoutRow}>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {totalBooks > 0 ? (
        <Text style={styles.summaryText}>
          You have logged {totalBooks} book{totalBooks > 1 ? "s" : ""} (
          {totalPages} pages in total)
        </Text>
      ) : null}

      {totalBooks > 0 && (
        <Text style={styles.statusStatsText}>
          Reading: {readingCount} · Finished: {finishedCount} · Want to read:{" "}
          {wantCount}
        </Text>
      )}

      {/* Filter row */}
      <View style={styles.filterRow}>
        {["All", "Reading", "Finished", "Want to read"].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterButton,
              statusFilter === option && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(option)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === option && styles.filterButtonTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort row */}
      <View style={styles.sortRow}>
        {["Recent", "Title", "Pages", "Rating"].map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.sortButton,
              sortOption === option && styles.sortButtonActive,
            ]}
            onPress={() => setSortOption(option)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortOption === option && styles.sortButtonTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by title or author"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <FlatList
        data={visibleBooks}
        keyExtractor={(item) => item.id}
        renderItem={renderBookItem}
        ListEmptyComponent={
          <Text style={{ marginTop: 20 }}>
            No books in this view. Try a different filter or add a book.
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate("AddBook")}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- ADD BOOK SCREEN ---------- */
function AddBookScreen({ navigation, setBooks }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [pagesRead, setPagesRead] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Finished");
  const [rating, setRating] = useState(0); // 0–5

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a book title.");
      return;
    }

    const total = pages ? parseInt(pages, 10) || 0 : 0;
    let read = pagesRead ? parseInt(pagesRead, 10) || 0 : 0;

    if (total > 0 && read > total) {
      read = total;
    }

    let finalStatus = status;
    if (total > 0 && read >= total) {
      finalStatus = "Finished";
    }

    const newBook = {
      id: Date.now().toString(),
      title: title.trim(),
      author: author.trim(),
      totalPages: total,
      pagesRead: read,
      description: description.trim(),
      status: finalStatus,
      rating,
      createdAt: Date.now(),
    };

    setBooks((prevBooks) => [...prevBooks, newBook]);
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.appTitle}>Add a Book</Text>

        <TextInput
          style={styles.input}
          placeholder="Book title *"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.input}
          placeholder="Author"
          value={author}
          onChangeText={setAuthor}
        />

        <TextInput
          style={styles.input}
          placeholder="Number of pages"
          value={pages}
          onChangeText={setPages}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Pages read (optional)"
          value={pagesRead}
          onChangeText={setPagesRead}
          keyboardType="numeric"
        />

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusRow}>
          {["Reading", "Finished", "Want to read"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusButton,
                status === option && styles.statusButtonActive,
              ]}
              onPress={() => setStatus(option)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === option && styles.statusButtonTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Rating (optional)</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((starValue) => (
            <TouchableOpacity
              key={starValue}
              onPress={() => setRating(starValue)}
            >
              <Text
                style={
                  rating >= starValue ? styles.starFilled : styles.starEmpty
                }
              >
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Short description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.buttonContainer}>
          <Button title="Save Book" onPress={handleSave} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- EDIT BOOK SCREEN ---------- */
function EditBookScreen({ navigation, route, setBooks }) {
  const { book } = route.params;

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author || "");
  const [pages, setPages] = useState(
    book.totalPages ? String(book.totalPages) : ""
  );
  const [pagesRead, setPagesRead] = useState(
    typeof book.pagesRead === "number" ? String(book.pagesRead) : ""
  );
  const [description, setDescription] = useState(book.description || "");
  const [status, setStatus] = useState(book.status || "Finished");
  const [rating, setRating] = useState(book.rating || 0);

  function handleSaveChanges() {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a book title.");
      return;
    }

    const total = pages ? parseInt(pages, 10) || 0 : 0;
    let read = pagesRead ? parseInt(pagesRead, 10) || 0 : 0;

    if (total > 0 && read > total) {
      read = total;
    }

    let finalStatus = status;
    if (total > 0 && read >= total) {
      finalStatus = "Finished";
    }

    const updatedBook = {
      ...book,
      title: title.trim(),
      author: author.trim(),
      totalPages: total,
      pagesRead: read,
      description: description.trim(),
      status: finalStatus,
      rating,
    };

    setBooks((prevBooks) =>
      prevBooks.map((b) => (b.id === book.id ? updatedBook : b))
    );

    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.appTitle}>Edit Book</Text>

        <TextInput
          style={styles.input}
          placeholder="Book title *"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={styles.input}
          placeholder="Author"
          value={author}
          onChangeText={setAuthor}
        />

        <TextInput
          style={styles.input}
          placeholder="Number of pages"
          value={pages}
          onChangeText={setPages}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Pages read (optional)"
          value={pagesRead}
          onChangeText={setPagesRead}
          keyboardType="numeric"
        />

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusRow}>
          {["Reading", "Finished", "Want to read"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.statusButton,
                status === option && styles.statusButtonActive,
              ]}
              onPress={() => setStatus(option)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === option && styles.statusButtonTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Rating (optional)</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((starValue) => (
            <TouchableOpacity
              key={starValue}
              onPress={() => setRating(starValue)}
            >
              <Text
                style={
                  rating >= starValue ? styles.starFilled : styles.starEmpty
                }
              >
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Short description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.buttonContainer}>
          <Button title="Save Changes" onPress={handleSaveChanges} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- ROOT APP & PERSISTENCE ---------- */
export default function App() {
  const [books, setBooks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load books on start
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const stored = await AsyncStorage.getItem("@books");
        if (stored) {
          setBooks(JSON.parse(stored));
        }
      } catch (e) {
        console.log("Error loading books", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadBooks();
  }, []);

  // Save whenever books change
  useEffect(() => {
    if (!isLoaded) return;
    const saveBooks = async () => {
      try {
        await AsyncStorage.setItem("@books", JSON.stringify(books));
      } catch (e) {
        console.log("Error saving books", e);
      }
    };
    saveBooks();
  }, [books, isLoaded]);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" options={{ headerShown: false }}>
          {(props) => <LoginScreen {...props} />}
        </Stack.Screen>

        <Stack.Screen name="BookList" options={{ title: "My Books" }}>
          {(props) => (
            <BookListScreen {...props} books={books} setBooks={setBooks} />
          )}
        </Stack.Screen>

        <Stack.Screen name="AddBook" options={{ title: "Add Book" }}>
          {(props) => <AddBookScreen {...props} setBooks={setBooks} />}
        </Stack.Screen>

        <Stack.Screen name="EditBook" options={{ title: "Edit Book" }}>
          {(props) => <EditBookScreen {...props} setBooks={setBooks} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-start",
    backgroundColor: "#f2f2f7",
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
    justifyContent: "flex-start",
    backgroundColor: "#f2f2f7",
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  logoutRow: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
  logoutText: {
    fontSize: 12,
    color: "#cc0000",
  },
  summaryText: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
    color: "#444",
  },
  statusStatsText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
    color: "#666",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    marginTop: 10,
  },
  bookItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  bookAuthor: {
    fontSize: 14,
    color: "#555",
  },
  bookRating: {
    fontSize: 12,
    color: "#e0a800",
    marginTop: 2,
  },
  bookStatus: {
    fontSize: 12,
    color: "#0066cc",
    marginTop: 2,
  },
  bookPages: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  bookProgress: {
    fontSize: 12,
    color: "#008000",
    marginTop: 2,
  },
  bookDescription: {
    fontSize: 12,
    color: "#444",
    marginTop: 4,
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#333",
    elevation: 4,
  },
  floatingButtonText: {
    color: "#fff",
    fontSize: 26,
    marginTop: -2,
  },
  statusRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  statusButtonActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  statusButtonText: {
    fontSize: 12,
    color: "#333",
  },
  statusButtonTextActive: {
    color: "#fff",
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  filterButtonText: {
    fontSize: 11,
    color: "#333",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  sortRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  sortButtonActive: {
    backgroundColor: "#444",
    borderColor: "#444",
  },
  sortButtonText: {
    fontSize: 11,
    color: "#333",
  },
  sortButtonTextActive: {
    color: "#fff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    marginBottom: 10,
    fontSize: 13,
  },
  sectionLabel: {
    marginBottom: 6,
    fontWeight: "bold",
  },
  ratingRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  starFilled: {
    fontSize: 22,
    color: "#e0a800",
    marginRight: 4,
  },
  starEmpty: {
    fontSize: 22,
    color: "#ccc",
    marginRight: 4,
  },
});
