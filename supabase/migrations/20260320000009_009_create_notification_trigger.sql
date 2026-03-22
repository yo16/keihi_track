-- 009: 通知トリガー関数（create_expense_notification）+ トリガー設定
-- 経費ステータス変更時に自動で通知レコードを生成する

CREATE OR REPLACE FUNCTION public.create_expense_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_applicant_name TEXT;
BEGIN
  -- 新規申請（INSERT）または再申請（UPDATE: rejected -> pending）
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
     OR (TG_OP = 'UPDATE' AND OLD.status = 'rejected' AND NEW.status = 'pending') THEN
    -- 申請者の表示名を取得
    SELECT display_name INTO v_applicant_name
    FROM public.organization_members
    WHERE org_id = NEW.org_id
      AND user_id = NEW.applicant_user_id
      AND deleted_at IS NULL;

    -- 承認者・管理者全員に通知を作成（申請者本人は除く）
    INSERT INTO public.notifications (org_id, user_id, expense_id, type, message)
    SELECT
      NEW.org_id,
      om.user_id,
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN 'new_expense' ELSE 'resubmitted' END,
      CASE WHEN TG_OP = 'INSERT'
        THEN v_applicant_name || 'が経費申請を提出しました'
        ELSE v_applicant_name || 'が経費申請を再提出しました'
      END
    FROM public.organization_members om
    WHERE om.org_id = NEW.org_id
      AND om.role IN ('admin', 'approver')
      AND om.deleted_at IS NULL
      AND om.user_id != NEW.applicant_user_id;
  END IF;

  -- 承認
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (org_id, user_id, expense_id, type, message)
    VALUES (NEW.org_id, NEW.applicant_user_id, NEW.id, 'approved', '経費申請が承認されました');
  END IF;

  -- 却下
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (org_id, user_id, expense_id, type, message)
    VALUES (NEW.org_id, NEW.applicant_user_id, NEW.id, 'rejected', '経費申請が却下されました');
  END IF;

  RETURN NEW;
END;
$$;

-- expenses テーブルへのトリガー設定
CREATE TRIGGER trg_expense_notification
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expense_notification();
