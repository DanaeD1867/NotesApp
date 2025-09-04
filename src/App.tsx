"use client";

import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Image,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { getUrl, uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import { Amplify } from "aws-amplify";
import config from "../amplify_outputs.json";

Amplify.configure(config); 

const client = generateClient<Schema>({
  authMode: "userPool",
});

interface Note {
  name: string | null;
  description: string | null;
  image: string | null;
  readonly id: string;
  owner: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data: notes } = await client.models.Note.list();

    const processedNotes = await Promise.all(
      notes.map(async (note) => {
        if (note.image) {
          const linkToStorageFile = await getUrl({
            path: ({ identityId }) => `media/${identityId}/${note.image}`,
          });
          note.image = linkToStorageFile.url.toString();
        }
        return note;
      })
    );

    setNotes(processedNotes);
  }

  async function createNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const imageFile = form.get("image") as File;

    const { data: newNote } = await client.models.Note.create({
      name: form.get("name")?.toString() ?? "",
      description: form.get("description")?.toString() ?? "",
      image: imageFile?.name ?? "",
    });

    if (newNote?.image && imageFile) {
      await uploadData({
        path: ({ identityId }) => `media/${identityId}/${newNote.image}`,
        data: imageFile,
      }).result;
    }

    await fetchNotes();
    event.currentTarget.reset();
  }

  async function deleteNote(id: string) {
    await client.models.Note.delete({ id });
    await fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>My Notes App</Heading>

          <View as="form" margin="3rem 0" onSubmit={createNote}>
            <Flex direction="column" gap="2rem" padding="2rem">
              <TextField
                name="name"
                placeholder="Note Name"
                label="Note Name"
                labelHidden
                variation="quiet"
                required
              />
              <TextField
                name="description"
                placeholder="Note Description"
                label="Note Description"
                labelHidden
                variation="quiet"
                required
              />
              <View
                name="image"
                as="input"
                type="file"
                alignSelf="end"
                accept="image/png, image/jpeg"
              />
              <Button type="submit" variation="primary">
                Create Note
              </Button>
            </Flex>
          </View>

          <Divider />
          <Heading level={2}>Current Notes</Heading>

          <Grid
            margin="3rem 0"
            autoFlow="column"
            justifyContent="center"
            gap="2rem"
            alignContent="center"
          >
            {notes.map((note) => (
              <Flex
                key={note.id}
                direction="column"
                justifyContent="center"
                alignItems="center"
                gap="2rem"
                border="1px solid #ccc"
                padding="2rem"
                borderRadius="5%"
              >
                <Heading level={3}>{note.name}</Heading>
                <Text fontStyle="italic">{note.description}</Text>
                {note.image && (
                  <Image
                    src={note.image}
                    alt={`visual aid for ${note.name}`}
                    style={{ width: 400 }}
                  />
                )}
                <Button
                  variation="destructive"
                  onClick={() => deleteNote(note.id)}
                >
                  Delete note
                </Button>
              </Flex>
            ))}
          </Grid>

          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
    </Authenticator>
  );
}
