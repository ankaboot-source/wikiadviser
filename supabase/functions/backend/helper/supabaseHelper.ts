// backend/src/helper/supabaseHelper.ts

import { createClient } from "supabase";
import { Database, Enums, Tables } from "../types/index.ts";
const supabaseUrl = Deno.env.get("SUPABASE_PROJECT_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SECRET_PROJECT_TOKEN")!;

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  global: { fetch: fetch },
});

export async function insertArticle(
  title: string,
  userId: string,
  language: string,
  description?: string,
  imported?: boolean,
): Promise<string> {
  try {
    const { data: articlesData, error: articlesError } = await supabase
      .from("articles")
      .insert({ title, description, language, imported })
      .select("id");

    if (articlesError) {
      console.error("Error inserting article: ", articlesError);
      throw new Error(`Failed to insert article: ${articlesError.message}`);
    }

    if (!articlesData || articlesData.length === 0) {
      throw new Error("Failed to retrieve article ID after insertion.");
    }

    const articleId = articlesData[0].id;

    const { error: permissionsError } = await supabase
      .from("permissions")
      .insert({ role: "owner", user_id: userId, article_id: articleId });

    if (permissionsError) {
      console.error("Error inserting permission: ", permissionsError);
      throw new Error(
        `Failed to insert permission: ${permissionsError.message}`,
      );
    }

    return articleId;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in insertArticle: ", error);
      throw new Error(`Unexpected error in insertArticle: ${error.message}`);
    } else {
      console.error("Unexpected error in insertArticle: ", error);
      throw new Error(
        `Unexpected error in insertArticle: An unknown error occurred`,
      );
    }
  }
}

export async function updateChange(toChange: Tables<"changes">): Promise<void> {
  try {
    const { id, ...updateData } = toChange;
    const { error: changeError } = await supabase
      .from("changes")
      .update(updateData)
      .eq("id", id);

    if (changeError) {
      console.error("Error updating change: ", changeError);
      throw new Error(`Failed to update change: ${changeError.message}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in updateChange: ", error);
      throw new Error(`Unexpected error in updateChange: ${error.message}`);
    } else {
      console.error("Unexpected error in updateChange: ", error);
      throw new Error(
        `Unexpected error in updateChange: An unknown error occurred`,
      );
    }
  }
}

export async function upsertChanges(
  changesToUpsert: Tables<"changes">[],
): Promise<void> {
  try {
    const { error } = await supabase.from("changes").upsert(changesToUpsert, {
      defaultToNull: false,
      onConflict: "id",
    });

    if (error) {
      console.error("Error upserting changes: ", error);
      throw new Error(`Failed to upsert changes: ${error.message}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in upsertChanges: ", error);
      throw new Error(`Unexpected error in upsertChanges: ${error.message}`);
    } else {
      console.error("Unexpected error in upsertChanges: ", error);
      throw new Error(
        `Unexpected error in upsertChanges: An unknown error occurred`,
      );
    }
  }
}

export async function updateCurrentHtmlContent(
  articleId: string,
  current_html_content: string,
) {
  try {
    const { error: articleError } = await supabase
      .from("articles")
      .update({ current_html_content })
      .eq("id", articleId);

    if (articleError) {
      console.error("Error updating HTML content: ", articleError);
      throw new Error(`Failed to update HTML content: ${articleError.message}`);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in updateCurrentHtmlContent: ", error);
      throw new Error(
        `Unexpected error in updateCurrentHtmlContent: ${error.message}`,
      );
    } else {
      console.error("Unexpected error in updateCurrentHtmlContent: ", error);
      throw new Error(
        `Unexpected error in updateCurrentHtmlContent: An unknown error occurred`,
      );
    }
  }
}

export async function getArticle(articleId: string) {
  try {
    const { data: articleData, error: articleError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (articleError) {
      console.error("Error getting article: ", articleError);
      throw new Error(`Failed to get article: ${articleError.message}`);
    }

    return articleData;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in getArticle: ", error);
      throw new Error(`Unexpected error in getArticle: ${error.message}`);
    } else {
      console.error("Unexpected error in getArticle: ", error);
      throw new Error(
        `Unexpected error in getArticle: An unknown error occurred`,
      );
    }
  }
}

export async function getChanges(articleId: string) {
  try {
    const { data: changesData, error: changesError } = await supabase
      .from("changes")
      .select(
        `
                id,
                content,
                created_at,
                description,
                status,
                type_of_edit,
                index,
                article_id,
                contributor_id,
                revision_id,
                archived,
                hidden,
                user: profiles(id, email, avatar_url, default_avatar, allowed_articles), 
                comments(content,created_at, user: profiles(id, email, avatar_url, default_avatar, allowed_articles)),
                revision: revisions(summary, revid)
                `,
      )
      .order("index")
      .eq("article_id", articleId);

    if (changesError) {
      console.error("Error getting changes: ", changesError);
      throw new Error(`Failed to get changes: ${changesError.message}`);
    }

    return changesData;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in getChanges: ", error);
      throw new Error(`Unexpected error in getChanges: ${error.message}`);
    } else {
      console.error("Unexpected error in getChanges: ", error);
      throw new Error(
        `Unexpected error in getChanges: An unknown error occurred`,
      );
    }
  }
}

export async function deleteArticleDB(articleId: string) {
  try {
    const { error: supabaseDeleteError } = await supabase
      .from("articles")
      .delete()
      .eq("id", articleId);

    if (supabaseDeleteError) {
      console.error("Error deleting article: ", supabaseDeleteError);
      throw new Error(
        `Failed to delete article: ${supabaseDeleteError.message}`,
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in deleteArticleDB: ", error);
      throw new Error(`Failed to delete article: ${error.message}`);
    } else {
      console.error("Unexpected error in deleteArticleDB: ", error);
      throw new Error(
        `Unexpected error in deleteArticleDB: An unknown error occurred`,
      );
    }
  }
}

export async function getUserPermission(
  articleId: string,
  userId: string,
): Promise<Enums<"role"> | null> {
  try {
    const { data, error } = await supabase
      .from("permissions")
      .select("role")
      .eq("user_id", userId)
      .eq("article_id", articleId)
      .maybeSingle();

    if (error) {
      console.error("Error getting user permission: ", error);
      throw new Error(`Failed to get user permission: ${error.message}`);
    }

    return data?.role || null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in getUserPermission: ", error);
      throw new Error(`Failed to get user permission: ${error.message}`);
    } else {
      console.error("Unexpected error in getUserPermission: ", error);
      throw new Error(
        `Unexpected error in getUserPermission: An unknown error occurred`,
      );
    }
  }
}

export async function insertRevision(
  article_id: string,
  revid: string,
  summary: string,
): Promise<string> {
  try {
    const revidNumber = Number(revid);

    if (isNaN(revidNumber)) {
      throw new Error("Invalid revid: revid must be a number");
    }

    const { data: revisionsData, error: revisionsError } = await supabase
      .from("revisions")
      .insert({ article_id, revid: revidNumber, summary })
      .select("id");

    if (revisionsError) {
      console.error("Error inserting revision: ", revisionsError);
      throw new Error(`Failed to insert revision: ${revisionsError.message}`);
    }

    if (!revisionsData || revisionsData.length === 0) {
      throw new Error("Failed to retrieve revision ID after insertion.");
    }

    const [revision] = revisionsData;
    return revision.id;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in insertRevision: ", error);
      throw new Error(`Failed to insert revision: ${error.message}`);
    } else {
      console.error("Unexpected error in insertRevision: ", error);
      throw new Error(
        `Unexpected error in insertRevision: An unknown error occurred`,
      );
    }
  }
}

export async function getUserArticlesCount(userId: string) {
  try {
    const { data: articlesData, error: articlesError } = await supabase
      .from("permissions")
      .select("id")
      .eq("user_id", userId);

    if (articlesError) {
      console.error("Error getting user articles count: ", articlesError);
      throw new Error(
        `Failed to get user articles count: ${articlesError.message}`,
      );
    }

    return articlesData ? articlesData.length : 0;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Unexpected error in getUserArticlesCount: ", error);
      throw new Error(`Failed to get user articles count: ${error.message}`);
    } else {
      console.error("Unexpected error in getUserArticlesCount: ", error);
      throw new Error(
        `Unexpected error in getUserArticlesCount: An unknown error occurred`,
      );
    }
  }
}
