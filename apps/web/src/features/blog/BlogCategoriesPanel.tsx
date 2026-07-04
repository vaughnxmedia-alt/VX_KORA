import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  BLOG_UNCATEGORIZED,
  ensureUniqueCategorySlug,
  formatBlogCategoryError,
  slugifyCategoryName,
  sortBlogCategories,
  type BlogCategoryRecord,
} from "@/lib/blog-categories";

type BlogCategoriesPanelProps = {
  postCountsByCategory: Record<string, number>;
  onCategoriesChanged?: () => void;
};

type CategoryFormState = {
  name: string;
  slug: string;
  is_active: boolean;
  featured_insights_eligible: boolean;
};

const emptyForm = (): CategoryFormState => ({
  name: "",
  slug: "",
  is_active: true,
  featured_insights_eligible: false,
});

export function BlogCategoriesPanel({
  postCountsByCategory,
  onCategoriesChanged,
}: BlogCategoriesPanelProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategoryRecord | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogCategoryRecord | null>(null);
  const [reassignTo, setReassignTo] = useState(BLOG_UNCATEGORIZED);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_categories")
      .select("id, name, slug, display_order, is_active, featured_insights_eligible, created_at, updated_at")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Could not load categories",
        description: formatBlogCategoryError(error),
        variant: "destructive",
      });
      setCategories([]);
    } else {
      setCategories(sortBlogCategories((data ?? []) as BlogCategoryRecord[]));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const sortedCategories = useMemo(() => sortBlogCategories(categories), [categories]);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm(emptyForm());
    setSlugTouched(false);
    setEditorOpen(true);
  };

  const openEditDialog = (category: BlogCategoryRecord) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      is_active: category.is_active,
      featured_insights_eligible: category.featured_insights_eligible ?? false,
    });
    setSlugTouched(true);
    setEditorOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugifyCategoryName(name),
    }));
  };

  const validateForm = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    const name = form.name.trim();
    if (!name) return { ok: false, message: "Category name is required." };

    const slug = (form.slug.trim() || slugifyCategoryName(name)).toLowerCase();
    if (!slug) return { ok: false, message: "Category slug is required." };

    const nameConflict = sortedCategories.find(
      (category) =>
        category.id !== editingCategory?.id &&
        category.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (nameConflict) {
      return { ok: false, message: "A category with this name already exists." };
    }

    const slugConflict = sortedCategories.find(
      (category) => category.id !== editingCategory?.id && category.slug === slug,
    );
    if (slugConflict) {
      return { ok: false, message: "A category with this slug already exists." };
    }

    return { ok: true };
  };

  const saveCategory = async () => {
    const validation = await validateForm();
    if (!validation.ok) {
      toast({ title: "Cannot save category", description: validation.message, variant: "destructive" });
      return;
    }

    const name = form.name.trim();
    const existingSlugs = new Set(
      sortedCategories.filter((c) => c.id !== editingCategory?.id).map((c) => c.slug),
    );
    const slug = await ensureUniqueCategorySlug(
      (form.slug.trim() || slugifyCategoryName(name)).toLowerCase(),
      existingSlugs,
      editingCategory?.slug,
    );

    setSaving(true);
    try {
      if (editingCategory) {
        const { data, error } = await supabase
          .from("blog_categories")
          .update({
            name,
            slug,
            is_active: form.is_active,
            featured_insights_eligible: form.featured_insights_eligible,
          })
          .eq("id", editingCategory.id)
          .select("id, name, slug, display_order, is_active, featured_insights_eligible, created_at, updated_at")
          .single();

        if (error) throw error;
        if (!data) throw new Error("Category update did not return a row.");

        if (editingCategory.name !== name) {
          const { error: postsError } = await supabase
            .from("blog_posts")
            .update({ category: name })
            .eq("category", editingCategory.name);
          if (postsError) throw postsError;
        }
      } else {
        const nextOrder =
          sortedCategories.length > 0
            ? Math.max(...sortedCategories.map((c) => c.display_order)) + 10
            : 10;

        const { data, error } = await supabase
          .from("blog_categories")
          .insert({
            name,
            slug,
            is_active: form.is_active,
            featured_insights_eligible: form.featured_insights_eligible,
            display_order: nextOrder,
          })
          .select("id, name, slug, display_order, is_active, featured_insights_eligible, created_at, updated_at")
          .single();
        if (error) throw error;
        if (!data) throw new Error("Category insert did not return a row.");
      }

      toast({
        title: editingCategory ? "Category updated" : "Category created",
        description: `"${name}" is ready to use on blog posts.`,
      });
      setEditorOpen(false);
      await fetchCategories();
      onCategoriesChanged?.();
    } catch (error) {
      toast({
        title: "Save failed",
        description: formatBlogCategoryError(error),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const moveCategory = async (category: BlogCategoryRecord, direction: "up" | "down") => {
    const index = sortedCategories.findIndex((item) => item.id === category.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sortedCategories.length) return;

    const other = sortedCategories[swapIndex];
    setSaving(true);
    try {
      const [{ error: a }, { error: b }] = await Promise.all([
        supabase
          .from("blog_categories")
          .update({ display_order: other.display_order })
          .eq("id", category.id),
        supabase
          .from("blog_categories")
          .update({ display_order: category.display_order })
          .eq("id", other.id),
      ]);
      if (a) throw a;
      if (b) throw b;
      await fetchCategories();
      onCategoriesChanged?.();
    } catch (error) {
      toast({
        title: "Reorder failed",
        description: error instanceof Error ? error.message : "Could not reorder categories.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!deleteTarget) return;
    const postCount = postCountsByCategory[deleteTarget.name] ?? 0;
    const targetName = postCount > 0 ? reassignTo : deleteTarget.name;

    setSaving(true);
    try {
      if (postCount > 0) {
        const { error: postsError } = await supabase
          .from("blog_posts")
          .update({ category: targetName })
          .eq("category", deleteTarget.name);
        if (postsError) throw postsError;
      }

      const { error } = await supabase.from("blog_categories").delete().eq("id", deleteTarget.id);
      if (error) throw error;

      toast({
        title: "Category deleted",
        description:
          postCount > 0
            ? `${postCount} post${postCount === 1 ? "" : "s"} moved to "${targetName}".`
            : `"${deleteTarget.name}" was removed.`,
      });
      setDeleteTarget(null);
      await fetchCategories();
      onCategoriesChanged?.();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete category.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const reassignmentOptions = sortedCategories.filter(
    (category) => category.id !== deleteTarget?.id,
  );

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <FolderOpen className="h-5 w-5" />
              Blog Categories
            </CardTitle>
            <CardDescription>
              Manage The Brief category filters and the options available when editing posts.
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Featured Insights</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[180px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No categories yet. Add your first category to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCategories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {category.slug}
                      </TableCell>
                      <TableCell>{category.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={category.featured_insights_eligible ? "default" : "secondary"}>
                          {category.featured_insights_eligible ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>{postCountsByCategory[category.name] ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={saving || index === 0}
                            onClick={() => moveCategory(category, "up")}
                            aria-label={`Move ${category.name} up`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={saving || index === sortedCategories.length - 1}
                            onClick={() => moveCategory(category, "down")}
                            aria-label={`Move ${category.name} down`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(category)}
                            aria-label={`Edit ${category.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteTarget(category);
                              setReassignTo(BLOG_UNCATEGORIZED);
                            }}
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              Category names appear on blog posts and The Brief filter buttons.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Public Relations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setForm((prev) => ({ ...prev, slug: slugifyCategoryName(event.target.value) }));
                }}
                placeholder="public-relations"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <div>
                <Label htmlFor="category-featured-insights">Featured Insights slot</Label>
                <p className="text-xs text-muted-foreground">
                  Show one rotating card for this category on The Brief homepage.
                </p>
              </div>
              <Switch
                id="category-featured-insights"
                checked={form.featured_insights_eligible}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, featured_insights_eligible: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <div>
                <Label htmlFor="category-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive categories stay in admin but are hidden on `/the-brief`.
                </p>
              </div>
              <Switch
                id="category-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={saveCategory} disabled={saving}>
              {saving ? "Saving…" : editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `This will remove "${deleteTarget.name}" from category management. Blog posts will not be deleted.`
                : null}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (postCountsByCategory[deleteTarget.name] ?? 0) > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {postCountsByCategory[deleteTarget.name]} post
                {postCountsByCategory[deleteTarget.name] === 1 ? "" : "s"} currently use this category.
                Choose where they should go:
              </p>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Move posts to…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BLOG_UNCATEGORIZED}>Uncategorized</SelectItem>
                  {reassignmentOptions.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteCategory} disabled={saving}>
              {saving ? "Deleting…" : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
